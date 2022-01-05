import { BaseViewElement } from 'common/v-base.js';
import { adoptStyleSheets, css, customElement, first, html, onEvent } from 'dom-native';
const { assign } = Object;


const _compCss = css`
	:host{
		position: absolute;
		z-index: 100;
		top: 0; left: 0; bottom: 0; right: 0;
		background: rgba(0,0,0,.3);
	}

	.panel{
		position: absolute;
		width: 400px;
		top: 64px;
		bottom: 0;
		right: -400px;
		background: #fff;
		box-shadow: var(--elev-6-shadow);

		display: grid;
		grid-template-rows: 3rem 1fr .5rem 2rem;
		grid-template-columns: 1rem 1fr 2rem;
		padding-bottom: 1rem;
		transition: 0.2s right linear;
	}

	.panel.show{
		right: 0;
	}

	header{
		display: contents;
	}
	
	.title{
		align-self: center;
		grid-area: 1 / 2;		
	}
	
	/* style slot placehold as well */
	.title > *, .title > ::slotted(*){
		font-size: 1.2rem;
	}

	header c-ico{
		grid-area: 1 / 3;
		width: 1.5rem;
		height: 1.5rem;
		justify-self: center;
		align-self: center;
	}

	section{
		grid-area: 2 / 1 / 4 / 4;
	}

	::slotted(.panel-content) {
		padding: 0.5rem 0;
		display: grid;
		padding-left: 1rem;
		grid-template-columns: auto 1fr;
		grid-auto-rows: min-content;
		
		border-top: 1px solid #ccc;
		border-bottom: 1px solid #ccc;
	}
`;


@customElement('dg-slide')
export class DgSlide extends BaseViewElement {

	constructor() {
		super();
		adoptStyleSheets(this.attachShadow({ mode: 'open' }), _compCss).append(_renderShadow());
	}

	@onEvent('pointerup', '.do-close')
	doOk() {
		first(this.shadowRoot, ".panel")?.classList.remove("show");
		setTimeout(() => {
			this.remove();
		}, 1000);
	}


	init() {
		// add the content to be slotted
		this.innerHTML = `
			<div slot="title">User Profile</div>

			<div class="panel-content">
				<div class="username">Admin</div>
				<div></div>
				<div class="username1">admin</div>
				<div></div>
				<div class="rolename">Role: unknown</div>
				<div class="since">Member since: unknown</div>
			</div>
		`;

		setTimeout(() => {
			first(this.shadowRoot, ".panel")?.classList.add("show");
		}, 100);
	}
}

function _renderShadow() {
	return html`
		<div class="panel" part="panel">
			<header>
				<div class="title"><slot name="title"></slot></div>
				<c-ico class="do-close" src="#ico-close"></c-ico>
			</header>
			<section>
				<slot></slot>
			</section>
		</div>
	`;
}