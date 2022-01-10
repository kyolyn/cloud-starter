import { position, capture,activateDrag} from '@dom-native/draggable';
import { BaseViewElement } from 'common/v-base.js';
import { wksDco } from 'dcos';
import { all,append, closest, customElement, elem, first, on, OnEvent, onEvent, onHub, style } from 'dom-native';
import { Wks } from 'shared/entities.js';
import { asNum } from 'utils-min';
import {DgWksEdit} from './dg-wks-edit';

@customElement('v-home')
export class wksListView extends BaseViewElement {

		#isCardRankChange = false;

	private isBefore(cpanel: HTMLElement, ref: HTMLElement) {
		const cpanels = all(this, 'a.card');
		for (const cp of cpanels) {
			if (cp === cpanel) {
				return true;
			}
			if (cp === ref) {
				return false;
			}
		}
		return false;
	}

	//#region    ---------- Events---------- 
	@onEvent('click', '.wks-add')
	clickAddWks() {
		const dialogEl = append(document.body, elem('dg-wks-add'));
		on(dialogEl, 'WKS_ADD', (evt) => {
			wksDco.create(evt.detail);
		});
	}
	  
	// Note: since .card is a <a> tag, prevent following on click on .show-menu (must bind to click)
	@onEvent('click', 'a .show-menu')
	onShowClick(evt: MouseEvent & OnEvent) {
		evt.preventDefault();
		evt.cancelBubble = true;
	}
	@onEvent('pointerdown', 'a .show-menu')
	onStopWhenShow(evt: PointerEvent & OnEvent) {
		this.#isCardRankChange = true;
		evt.cancelBubble = true;
		evt.stopPropagation();
	}

	@onEvent('pointerup', '.show-menu')
	onCardShowMenuUp(evt: PointerEvent & OnEvent) {
		this.#isCardRankChange  = false;

		if (first('#wks-card-menu') == null) {
			const [menu] = append(document.body, `
			<c-menu id='wks-card-menu'>
			<li class="do-change">Edit</li>
			<li class="do-delete">Delete</li>
			</c-menu>`);

			position(menu, evt.selectTarget, { at: 'bottom', align: 'right' });

			const cardEl = closest(evt.selectTarget, '[data-type="Wks"]');
			on(menu, 'pointerup', '.do-delete', async (evt) => {
				const id = asNum(cardEl?.getAttribute('data-id'));
				if (id == null) {
					throw new Error(`UI ERROR - cannot find data-type Case data-id on element ${cardEl}`);
				}
				await wksDco.remove(id);
			})
			on(menu, 'pointerup', '.do-change', async(evt) =>{
				const id = asNum(cardEl?.getAttribute('data-id'));
				//const name = (await wksDco.get(id!)).name;
				const editView = append(document.body, elem('dg-wks-edit')) as DgWksEdit;
					editView.name = first(cardEl,"h2")?.innerText!;
					on(editView,'WKS_UPDATE',(evt) =>{
						wksDco.update(id!,evt.detail)
					});
			})
		}
	}

	@onEvent('pointerdown', 'a.card')
	onCardDrag(pointerDownEvt: PointerEvent & OnEvent) {
		if(this.#isCardRankChange){
			return;
		}
		
		const panel = pointerDownEvt.selectTarget as HTMLElement;

		let currentOver: HTMLElement | undefined;
		let currentOverPanel: HTMLElement | undefined;
		let animationHappening = false;
		activateDrag(panel, pointerDownEvt, {
			// NOTE 1 - the pointerCapture cannot be source (the default) since it will be re-attached causing a cancel
			//          @dom-native/draggable allows to set a custom pointerCapture
			// NOTE 2 - binding pointerCapture roolEl might have some significant performance impact on mobile devices (e.g.,, mobile safari).
			//          document.body shortest event path, and provides sensible performance gain on ipad.
			pointerCapture: document.body,

			// we will still drag the ghost (here could be 'none' as well)
			drag: 'ghost',

			// only used here to customize the ghost a little
			onDragStart: (evt) => {
				const { ghost } = evt.detail;

				style(ghost!, {
					opacity: '.5',
					background: 'red'
				});
			}, // /onDragStart

			onDrag: async (evt) => {

				// only proceed if no animation happening
				if (!animationHappening) {
					const { over } = evt.detail;

					// work further only if over has changed, that over is not self, and no pending animation
					if (over != panel && over != currentOver) {

						let overPanel: HTMLElement | undefined;
						// get the a.card from the over
						overPanel = over.classList.contains("card")?over :closest(over, 'a.card') as HTMLElement ?? undefined;

						// only perform animation overPanel is different
						if (overPanel != null && overPanel != currentOverPanel) {
							animationHappening = true;

							//// not-so-magic FLIP
							// 1) capture the panel positions
							const inv = capture(all(this, 'a.card'));

							// 2) move the panel
							const pos = this.isBefore(panel, overPanel) ? 'after' : 'before';
							append(overPanel, panel, pos);

							// 3) inver the position (pretend nothing happen)
							const play = inv();

							// 4) play the animation (got to love closure state capture)
							await play();

							// Now we are done (play return a promise when the animation is done - approximation -)
							animationHappening = false;
							// reset the currents (in case user follow the moved item)
							currentOverPanel = undefined;
							currentOver = undefined;
						} else {
							// update state for the next onDrag
							currentOverPanel = overPanel;
							currentOver = over;
						}
					}
				}
			}, // /onDrag

			onDragEnd: (evt) => {
				const cards = all(this, 'a.card');
				const cardOldRanks = cards.reduce((pv, c) => {
					const id = asNum(c.getAttribute('data-id')!)!;
					pv[id] = asNum(c?.getAttribute('data-rank'))!;
					return pv;
				}, {} as { [name: number]: number });

				cards.forEach(async (c, i) => {
					const id = asNum(c.getAttribute("data-id")!)!;
					// just update if rank change
					if (i + 1 !== cardOldRanks[id]) {
						await wksDco.update(asNum(c?.getAttribute('data-id'))!, { rank: i + 1 });
					}
				})
			}
		}); // /activateDrag
	};
	//#endregion ---------- /Events---------- 

	//#region    ---------- Hub Events ---------- 
	@onHub('dcoHub', 'Wks', 'create, update, remove')
	async onWksChange() {
		const wksList = await wksDco.list({orderBy:"rank"});
		this.refresh(wksList);
	}
	//#endregion ---------- /Hub Events ----------
	async init() {
		super.init();

		// BEST-PRATICE: init() should always attempt to draw the empty state without async when possible
		//               Here we do this with `this.refresh([])` which will 
		this.refresh([]); // this will execute in sync as it will not do any server request

		// Now that this element has rendered its empty state, call this.refresh() will will initiate
		// an async data fetching and therefore will execute later.
		this.refresh();
	}

	async refresh(wksList?: Wks[]) {
		// if no wksList, then, fetch the new list
		if (wksList == null) {
			wksList = await wksDco.list();
		}
		this.innerHTML = _render(wksList.sort((w1,w2)=>{
				return w1.rank > w2.rank ?1 : -1;
		}));
	}
	
}

function _render(wksList: Wks[] = []) {
	let html = `	<header><h1>Workspaces</h1></header>
	<section>
		<div class="card wks-add">
			<c-ico src="#ico-add"></c-ico>
			<h3>Add New Workspace</h3>
		</div>
	`;

	for (const p of wksList) {
		html += `			
		<a class="card wks" data-type="Wks" data-id="${p.id}"  data-rank="${p.rank}" href="/${p.id}">
		<header>
			<h2>${p.name}</h2>
			<c-ico src="#ico-more" class="show-menu"></c-ico>
		</header>
	</a>
	`
	};

	html += `</section>`;

	return html;

}