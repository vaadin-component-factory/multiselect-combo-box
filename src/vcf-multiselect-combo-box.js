/**
 * @license
 * Copyright (C) 2015 Vaadin Ltd.
 * This program is available under Commercial Vaadin Add-On License 3.0 (CVALv3).
 * See the file LICENSE.md distributed with this software for more information about licensing.
 * See [the website]{@link https://vaadin.com/license/cval-3} for the complete license.
 */

// import { html, PolymerElement } from '@polymer/polymer/polymer-element';
import { ThemableMixin } from '@vaadin/vaadin-themable-mixin';
import { ElementMixin } from '@vaadin/vaadin-element-mixin';
import { ComboBoxElement } from '@vaadin/vaadin-combo-box';
import '@vaadin/vaadin-license-checker/vaadin-license-checker';
import '@vaadin/vaadin-checkbox/vaadin-checkbox';

import { commitValue, overlaySelectedItemChanged, renderer } from './helpers';

/**
 * `<vcf-multiselect-combo-box>` A multiselect combobox
 *
 * ```html
 * <vcf-multiselect-combo-box></vcf-multiselect-combo-box>
 * ```
 *
 * ### Styling
 *
 * The following custom properties are available for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|-------------
 * `--vcf-multiselect-combo-box-property` | Example custom property | `unset`
 *
 * The following shadow DOM parts are available for styling:
 *
 * Part name | Description
 * ----------------|----------------
 * `part` | Example part
 *
 * The following state attributes are available for styling:
 *
 * Attribute    | Description | Part name
 * -------------|-------------|------------
 * `attribute` | Example styling attribute | :host
 *
 * @memberof Vaadin
 * @mixes ElementMixin
 * @mixes ThemableMixin
 * @demo demo/index.html
 */
class VcfMultiselectComboBox extends ElementMixin(ThemableMixin(ComboBoxElement)) {

  constructor() {
    super();

    this._boundOverriddenCommitValue = commitValue.bind(this);
    this._boundOverriddenOverlaySelectedItemChanged = overlaySelectedItemChanged.bind(this);
    this._boundRenderer = renderer.bind(this);
  }

  ready() {
    super.ready();

    this._commitValue = this._boundOverriddenCommitValue;
    this.renderer = this._boundRenderer;

    const boundOldOpenedChanged = this._openedChanged.bind(this);
    this._openedChanged = (value, old) => {
      boundOldOpenedChanged(value, old);

      if (value) {
        this._addTopButtons();
      }
    }
  }

  static get properties() {
    return {
      selectedItems: {
        type: Array,
        value: () => [],
        observer: '_selectedItemsChanged'
      }
    };
  }

  static get is() {
    return 'vcf-multiselect-combo-box';
  }

  static get version() {
    return '1.0.0';
  }

  connectedCallback() {
    super.connectedCallback();

    // This will prevent the component from setting the
    // `value` property and showing the blue tick beside
    // the selected item.
    this._selectedItemChanged = () => {};

    this.$.overlay.removeEventListener('selection-changed', this._boundOverlaySelectedItemChanged);
    this.$.overlay.addEventListener('selection-changed', this._boundOverriddenOverlaySelectedItemChanged);
  }

  _selectedItemsChanged(value, oldValue) {
    this._inputElementValue = value.reduce((prev, current) => {
      let val = '';
      if ((typeof current === 'string')) {
        val = current;
      } else {
        val = current[this.itemLabelPath];
      }
      return `${val}${prev === '' ? '' : `, ${prev}`}`;
    }, '')
    this.render();

    const e = new CustomEvent('selected-items-changed', {
      detail: value,
      composed: true,
      cancelable: false,
      bubbles: true
    });
    this.dispatchEvent(e);
  }

  /** @private */
  _isItemChecked(item) {
    if (typeof item === 'string') {
      return this.selectedItems.indexOf(item) > -1;
    } else {
      return this.selectedItems.some(i => i[this.itemValuePath] === item[this.itemValuePath]);
    }
  }

  /** @private */
  _addTopButtons() {
    if (this.opened) {
      const topButtonsContainer = document.createElement('div');
      topButtonsContainer.id = 'top-buttons-container';
      topButtonsContainer.style.display = 'flex';
      topButtonsContainer.style.flexDirection = 'column';
      topButtonsContainer.style.padding = '0 .5em 0';
      const selectAllButton = document.createElement('vaadin-button');
      selectAllButton.innerText = "Select All";
      const clearButton = document.createElement('vaadin-button');
      clearButton.innerText = "Clear";

      selectAllButton.addEventListener('click', () => {
        this.selectedItems = [...this.items];
      });

      clearButton.addEventListener('click', () => {
        this.selectedItems = [];
      });

      topButtonsContainer.appendChild(selectAllButton);
      topButtonsContainer.appendChild(clearButton);

      const targetNode = this.$.overlay.$.dropdown.$.overlay.$.content.shadowRoot;
      if (!targetNode.querySelector('#top-buttons-container')) {
        this.$.overlay.$.dropdown.$.overlay.$.content.shadowRoot.prepend(topButtonsContainer);
      }
    }
  }

  /**
   * @protected
   */
  static _finalizeClass() {
    super._finalizeClass();

    const devModeCallback = window.Vaadin.developmentModeCallback;
    const licenseChecker = devModeCallback && devModeCallback['vaadin-license-checker'];
    if (typeof licenseChecker === 'function') {
      licenseChecker(VcfMultiselectComboBox);
    }
  }
}

customElements.define(VcfMultiselectComboBox.is, VcfMultiselectComboBox);

/**
 * @namespace Vaadin
 */
window.Vaadin.VcfMultiselectComboBox = VcfMultiselectComboBox;
