import { ThemableMixin } from '@vaadin/vaadin-themable-mixin';
import { ElementMixin } from '@vaadin/component-base';
import { ComboBox } from '@vaadin/combo-box';
import '@vaadin/checkbox/vaadin-checkbox';
import { ComboBoxPlaceholder } from '@vaadin/combo-box/src/vaadin-combo-box-placeholder.js';

import {
  commitValue,
  overlaySelectedItemChanged,
  onEnter,
  _filteredItemsChanged,
  filterChanged,
  renderLabel,
  _itemsOrPathsChanged
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
class VcfMultiselectComboBox extends ElementMixin(ThemableMixin(ComboBox)) {
  constructor() {
    super();
    this._lastSelectedIndex = -1;
    this._boundOverriddenCommitValue = commitValue.bind(this);
    this.renderLabel = renderLabel.bind(this);
    this._boundOverriddenOverlaySelectedItemChanged = overlaySelectedItemChanged.bind(this);
    this._boundOnEnter = onEnter.bind(this);
    this._filteredItemsChanged = _filteredItemsChanged.bind(this);
    this._itemsOrPathsChanged = _itemsOrPathsChanged.bind(this);

    // This will prevent the component from setting the
    // `value` property and showing the blue tick beside
    // the selected item.
    this._selectedItemChanged = () => {};
    this._prefillFocusedItemLabel = () => {};
  }

  // todo jcg --vaadin-combo-box-overlay-max-height 41vh

  static get properties() {
    return {
      selectedItems: {
        type: Array,
        value: () => [],
        observer: '_selectedItemsChanged'
      },
      /**
       * The object used to localize this component.
       * For changing the default localization, change the entire
       * _i18n_ object or just the property you want to modify.
       **/

      i18n: {
        type: Object,
        value: function() {
          return {
            select: 'Select All',
            clear: 'Clear'
          };
        }
      }
    };
  }

  ready() {
    super.ready();

    this._commitValue = this._boundOverriddenCommitValue;
    this._onEnter = this._boundOnEnter;
    this._filterChanged = filterChanged.bind(this);

    const boundOldOpenedChanged = this._openedChanged.bind(this);
    this._openedChanged = (value, old) => {
      if (this.filteredItems) {
        this._focusedIndex = this.filteredItems.findIndex(item => !this._isItemChecked(item));
      }
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

    this.$.dropdown.removeEventListener('selection-changed', this._boundOverlaySelectedItemChanged);
    this.$.dropdown.addEventListener('selection-changed', this._boundOverriddenOverlaySelectedItemChanged);

    // override vaadin-combobox-scroller _isItemSelected
    this.$.dropdown._scroller.__isItemSelected = (item, selectedItem, itemIdPath) => {
      if (item instanceof ComboBoxPlaceholder) {
        return false;
      } else {
        return this._isItemChecked(item);
      }
    };
    this.$.dropdown._scroller.__boundOnItemClick = this.__onItemClick.bind(this.$.dropdown._scroller);
  }

  __onItemClick(e) {
    if (e.detail && e.detail.sourceEvent && e.detail.sourceEvent.stopPropagation) {
      this._stopPropagation(e.detail.sourceEvent);
    }
    e.currentTarget.selected = !e.currentTarget.selected;

    this.dispatchEvent(new CustomEvent('selection-changed', { detail: { item: e.currentTarget.item } }));
  }

  _selectedItemsChanged(value, oldValue) {
    if (this.filteredItems) {
      this.filteredItems = this.filteredItems
        .sort((a, b) => {
          let indexA;
          let indexB;
          if (typeof a === 'string') {
            indexA = this.selectedItems.indexOf(a);
            indexB = this.selectedItems.indexOf(b);
          } else {
            indexA = this.selectedItems.findIndex(i => i[this.itemValuePath] === a[this.itemValuePath]);
            indexB = this.selectedItems.findIndex(i => i[this.itemValuePath] === b[this.itemValuePath]);
          }

          if (indexA > -1 && indexB > -1) {
            return indexB - indexA;
          } else if (indexA > -1) {
            return -1;
          } else if (indexB > -1) {
            return 1;
          } else {
            return 0;
          }
        })
        .slice(0);
    }

    this.requestContentUpdate();

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
      this._lastSelectedIndex = this.filteredItems.findIndex(item2 => item2 === item);
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
      this._lastSelectedIndex = this.filteredItems.findIndex(item2 => item2 === item);

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
      selectAllButton.innerText = this.i18n.select;
      selectAllButton.setAttribute('theme', 'small');
      selectAllButton.style.flexGrow = 1;
      selectAllButton.style.flexBasis = 0;
      selectAllButton.style.marginRight = 'var(--lumo-space-xs)';
      selectAllButton.style.marginLeft = 'var(--lumo-space-xs)';
      const clearButton = document.createElement('vaadin-button');
      clearButton.setAttribute('theme', 'small');
      clearButton.innerText = this.i18n.clear;
      clearButton.style.flexGrow = 1;
      clearButton.style.flexBasis = 0;
      clearButton.style.marginRight = 'var(--lumo-space-xs)';

      selectAllButton.addEventListener('click', () => {
        if (this.items) {
          this.selectedItems = [...this.items];
        } else if (this.$server) {
          this.$server.selectAll();
        }
        // refresh all checkboxes visible (the other will be sync)
        Array.from(this.$.dropdown._scroller.children).forEach(function(item) {
          if (item.nodeName === 'VAADIN-COMBO-BOX-ITEM') {
            item.selected = true;
          }
        });
      });

      clearButton.addEventListener('click', () => {
        this.selectedItems = [];
        // refresh all checkboxes visible (the other will be sync)
        Array.from(this.$.dropdown._scroller.children).forEach(function(item) {
          if (item.nodeName === 'VAADIN-COMBO-BOX-ITEM') {
            item.selected = false;
          }
        });
      });

      topButtonsContainer.appendChild(selectAllButton);
      topButtonsContainer.appendChild(clearButton);

      const targetNode = this.$.dropdown.$.overlay.shadowRoot.querySelector('[part~="content"]');
      if (!targetNode.querySelector('#top-buttons-container')) {
        targetNode.prepend(topButtonsContainer);
      }
    }
  }

  static get is() {
    return 'vcf-multiselect-combo-box';
  }

  static get version() {
    return '2.1.0';
  }
}

customElements.define(VcfMultiselectComboBox.is, VcfMultiselectComboBox);

/**
 * @namespace Vaadin
 */
window.Vaadin.VcfMultiselectComboBox = VcfMultiselectComboBox;
