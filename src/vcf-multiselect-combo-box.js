/**
 * @license
 * Copyright (C) 2015 Vaadin Ltd.
 * This program is available under Commercial Vaadin Add-On License 3.0 (CVALv3).
 * See the file LICENSE.md distributed with this software for more information about licensing.
 * See [the website]{@link https://vaadin.com/license/cval-3} for the complete license.
 */

import { ThemableMixin } from '@vaadin/vaadin-themable-mixin';
import { ElementMixin } from '@vaadin/vaadin-element-mixin';
import { ComboBoxElement } from '@vaadin/vaadin-combo-box';
import '@vaadin/vaadin-checkbox/vaadin-checkbox';
import { ComboBoxPlaceholder } from '@vaadin/vaadin-combo-box/src/vaadin-combo-box-placeholder.js';

import {
  commitValue,
  overlaySelectedItemChanged,
  onEnter,
  _filteredItemsChanged,
  filterChanged,
  renderLabel,
  setOverlayHeight
} from './helpers';

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
    this.renderLabel = renderLabel.bind(this);
    this._boundOverriddenOverlaySelectedItemChanged = overlaySelectedItemChanged.bind(this);
    this._boundOnEnter = onEnter.bind(this);
    this._filteredItemsChanged = _filteredItemsChanged.bind(this);

    // This will prevent the component from setting the
    // `value` property and showing the blue tick beside
    // the selected item.
    this._selectedItemChanged = () => {};
    this._prefillFocusedItemLabel = () => {};
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

  ready() {
    super.ready();

    this._commitValue = this._boundOverriddenCommitValue;
    this._onEnter = this._boundOnEnter;
    this._filterChanged = filterChanged.bind(this);

    this._filterChanged = filterChanged.bind(this);

    const boundOldOpenedChanged = this._openedChanged.bind(this);
    this._openedChanged = (value, old) => {
      boundOldOpenedChanged(value, old);

      if (value) {
        this._addTopButtons();

        this._inputElementValue = '';
      }

      if (!this.opened) {
        const e = new CustomEvent('on-close', {
          detail: value,
          composed: true,
          cancelable: false,
          bubbles: true
        });
        this.dispatchEvent(e);
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();

    this.$.overlay.removeEventListener('selection-changed', this._boundOverlaySelectedItemChanged);
    this.$.overlay.addEventListener('selection-changed', this._boundOverriddenOverlaySelectedItemChanged);
    this.$.overlay._setOverlayHeight = setOverlayHeight.bind(this.$.overlay);

    this.$.overlay._isItemSelected = (item, selectedItem, itemIdPath) => {
      if (item instanceof ComboBoxPlaceholder) {
        return false;
      } else {
        return this._isItemChecked(item);
      }
    };

    this.$.overlay._onItemClick = e => {
      if (e.detail && e.detail.sourceEvent && e.detail.sourceEvent.stopPropagation) {
        this._stopPropagation(e.detail.sourceEvent);
      }
      e.model.children[1].selected = !e.model.children[1].selected;

      this.$.overlay.dispatchEvent(new CustomEvent('selection-changed', { detail: { item: e.model.item } }));
    };
  }

  _selectedItemsChanged(value, oldValue) {
    if (this.items) {
      this.items = this.items
        .sort((a, b) => {
          if (typeof a === 'string') {
            if (this.selectedItems.indexOf(a) > -1) {
              return -1;
            } else if (this.selectedItems.indexOf(b) > -1) {
              return 1;
            } else {
              return 0;
            }
          } else {
            if (this.selectedItems.some(i => i[this.itemValuePath] === a[this.itemValuePath])) {
              return -1;
            } else if (this.selectedItems.some(i => i[this.itemValuePath] === b[this.itemValuePath])) {
              return 1;
            } else {
              return 0;
            }
          }
        })
        .slice(0);
    }

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
  _selectItem(item) {
    if (!this._isItemChecked(item)) {
      this.selectedItems = [...this.selectedItems, item];
    }
  }

  _deselectItem(item) {
    if (this._isItemChecked(item)) {
      const itemIndex = this.selectedItems.findIndex(i => {
        if (typeof item === 'string') {
          return i === item;
        } else {
          return i[this.itemValuePath] === item[this.itemValuePath];
        }
      });

      this.selectedItems = [...this.selectedItems.slice(0, itemIndex), ...this.selectedItems.slice(itemIndex + 1)];
    }
  }

  /** @private */
  _addTopButtons() {
    if (this.opened) {
      const topButtonsContainer = document.createElement('div');
      topButtonsContainer.id = 'top-buttons-container';
      topButtonsContainer.style.display = 'flex';
      topButtonsContainer.style.flexDirection = 'row';
      const selectAllButton = document.createElement('vaadin-button');
      selectAllButton.innerText = 'Select All';
      selectAllButton.setAttribute('theme', 'small');
      selectAllButton.style.flexGrow = 1;
      const clearButton = document.createElement('vaadin-button');
      clearButton.setAttribute('theme', 'small');
      clearButton.innerText = 'Clear';
      clearButton.style.flexGrow = 1;

      selectAllButton.addEventListener('click', () => {
        if (this.items) {
          this.selectedItems = [...this.items];
        } else if (this.$server) {
          this.$server.selectAll();
        }
        // refresh all checkboxes visible (the other will be sync)
        Array.from(this.$.overlay._selector.children).forEach(function(item) {
          if (item.nodeName === 'VAADIN-COMBO-BOX-ITEM') {
            item.selected = true;
          }
        });
      });

      clearButton.addEventListener('click', () => {
        this.selectedItems = [];
        // refresh all checkboxes visible (the other will be sync)
        Array.from(this.$.overlay._selector.children).forEach(function(item) {
          if (item.nodeName === 'VAADIN-COMBO-BOX-ITEM') {
            item.selected = false;
          }
        });
      });

      topButtonsContainer.appendChild(selectAllButton);
      topButtonsContainer.appendChild(clearButton);

      const targetNode = this.$.overlay.$.dropdown.$.overlay.$.content.shadowRoot;
      if (!targetNode.querySelector('#top-buttons-container')) {
        targetNode.prepend(topButtonsContainer);
      }
    }
  }

  static get is() {
    return 'vcf-multiselect-combo-box';
  }

  static get version() {
    return '0.2.0';
  }
}

customElements.define(VcfMultiselectComboBox.is, VcfMultiselectComboBox);

/**
 * @namespace Vaadin
 */
window.Vaadin.VcfMultiselectComboBox = VcfMultiselectComboBox;
