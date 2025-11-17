class StarBorderElement extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'speed', 'thickness'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    const color = this.getAttribute('color') || '#ffffff';
    const speed = this.getAttribute('speed') || '6s';
    const thickness = this.getAttribute('thickness') || '1';
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        :host(.icon-border) {
          display: inline-block;
          width: auto;
        }
        .star-border-container {
          display: block;
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          width: 100%;
        }
        :host(.icon-border) .star-border-container {
          display: inline-block;
          width: auto;
        }
        .border-gradient-bottom,
        .border-gradient-top {
          position: absolute;
          width: 300%;
          height: 50%;
          opacity: 0.65;
          border-radius: 50%;
          background: radial-gradient(circle, ${color}, transparent 10%);
          animation-duration: ${speed};
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-direction: alternate;
          z-index: 0;
        }
        .border-gradient-bottom {
          bottom: calc(-12px - ${thickness}px);
          right: -250%;
          animation-name: star-movement-bottom;
        }
        .border-gradient-top {
          top: calc(-12px - ${thickness}px);
          left: -250%;
          animation-name: star-movement-top;
        }
        .inner-content {
          position: relative;
          border-radius: inherit;
          border: ${thickness}px solid rgba(255, 255, 255, 0.08);
          display: block;
          background: transparent;
          z-index: 1;
        }
        .inner-content ::slotted(*) {
          display: block;
          width: 100%;
          border-radius: inherit;
        }
        @keyframes star-movement-bottom {
          0% {
            transform: translate(0%, 0%);
            opacity: 1;
          }
          100% {
            transform: translate(-100%, 0%);
            opacity: 0;
          }
        }
        @keyframes star-movement-top {
          0% {
            transform: translate(0%, 0%);
            opacity: 1;
          }
          100% {
            transform: translate(100%, 0%);
            opacity: 0;
          }
        }
      </style>
      <div class="star-border-container">
        <div class="border-gradient-bottom"></div>
        <div class="border-gradient-top"></div>
        <div class="inner-content"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define('star-border', StarBorderElement);
