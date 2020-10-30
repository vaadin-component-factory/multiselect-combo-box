/* eslint-disable no-invalid-this */

export function commitValue() {
  if (this.$.overlay._items && this._focusedIndex > -1) {
    const focusedItem = this.$.overlay._items[this._focusedIndex];
    if (this.selectedItem !== focusedItem) {
      this.selectedItem = focusedItem;
    }
    // make sure input field is updated in case value doesn't change (i.e. FOO -> foo)
    // this._inputElementValue = this._getItemLabel(this.selectedItem);
  } else if (this._inputElementValue === '' || this._inputElementValue === undefined) {
    this.selectedItem = null;

    if (this.allowCustomValue) {
      this.value = '';
    }
  } else {
    if (
      this.allowCustomValue &&
      // to prevent a repetitive input value being saved after pressing ESC and Tab.
      !(
        this.filteredItems &&
        this.filteredItems.filter(item => this._getItemLabel(item) === this._inputElementValue).length
      )
    ) {
      const e = new CustomEvent('custom-value-set', {
        detail: this._inputElementValue,
        composed: true,
        cancelable: true,
        bubbles: true
      });
      this.dispatchEvent(e);
      if (!e.defaultPrevented) {
        const customValue = this._inputElementValue;
        this._selectItemForValue(customValue);
        this.value = customValue;
      }
    }
  }

  this._detectAndDispatchChange();

  this._clearSelectionRange();

  if (!this.dataProvider) {
    this.filter = '';
  }

  this.renderLabel();
}

export function renderLabel() {
  this._inputElementValue = this.selectedItems.reduce((prev, current) => {
    let val = '';
    if (typeof current === 'string') {
      val = current;
    } else {
      val = current[this.itemLabelPath];
    }
    return `${val}${prev === '' ? '' : `, ${prev}`}`;
  }, '');
}

export function overlaySelectedItemChanged(e) {
  // stop this private event from leaking outside.
  e.stopPropagation();
  /** handle the selection **/
  if (!this._isItemChecked(e.detail.item)) {
    this._selectItem(e.detail.item);
  } else {
    this._deselectItem(e.detail.item);
  }

  if (this.opened) {
    this._focusedIndex = this.filteredItems.indexOf(e.detail.item);
  } else if (this.selectedItem !== e.detail.item) {
    this.selectedItem = e.detail.item;
    this._detectAndDispatchChange();
  }
  this.dispatchEvent(new CustomEvent('change', { bubbles: true }));
}

export function onEnter(e) {
  // should close on enter when custom values are allowed, input field is cleared, or when an existing
  // item is focused with keyboard. If auto open is disabled, under the same conditions, commit value.
  if (
    (this.opened || this.autoOpenDisabled) &&
    (this.allowCustomValue || this._inputElementValue === '' || this._focusedIndex > -1)
  ) {
    const targetItem = this.filteredItems[this._focusedIndex];

    if (!(typeof targetItem === 'undefined')) {
      const previousSelection = this._isItemChecked(targetItem);
      if (!previousSelection) {
        this._selectItem(targetItem);
      } else {
        this._deselectItem(targetItem);
      }

      // refresh all checkboxes visible (the other will be sync)
      Array.from(this.$.overlay._selector.children).forEach(function(item) {
        if (item.nodeName === 'VAADIN-COMBO-BOX-ITEM' && item.item === targetItem) {
          item.selected = !previousSelection;
        }
      });
    }

    // this.$.overlay._selector.
    // Do not submit the surrounding form.
    e.preventDefault();

    // Do not trigger global listeners
    e.stopPropagation();
  }
}

export function filterChanged(filter, itemValuePath, itemLabelPath) {
  if (filter === undefined) {
    return;
  }

  // Notify the dropdown about filter changing, so to let it skip the
  // scrolling restore
  this.$.overlay.filterChanged = true;

  if (this.items) {
    if (filter) {
      this.filteredItems = [...this.selectedItems, ...this._filterItems(this.items, filter)];
    } else {
      this.filteredItems = this._filterItems(this.items, filter);
    }
  } else {
    // With certain use cases (e. g., external filtering), `items` are
    // undefined. Filtering is unnecessary per se, but the filteredItems
    // observer should still be invoked to update focused item.
    this._filteredItemsChanged({ path: 'filteredItems', value: this.filteredItems }, itemValuePath, itemLabelPath);
  }
}

/**
 * Change the default to focus on the first items not selected after filtering
 * @param e
 * @param itemValuePath
 * @param itemLabelPath
 * @private
 */
export function _filteredItemsChanged(e, itemValuePath, itemLabelPath) {
  if (e.value === undefined) {
    return;
  }
  if (e.path === 'filteredItems' || e.path === 'filteredItems.splices') {
    this._setOverlayItems(this.filteredItems);

    if (this.opened || this.autoOpenDisabled) {
      this._focusedIndex = this.filteredItems.findIndex(item => !this._isItemChecked(item));
    } else {
      this._focusedIndex = -1;
    }

    if (this.opened) {
      this._repositionOverlay();
    }
  }
}

export function setOverlayHeight() {
  if (!this.opened || !this.positionTarget || !this._selector) {
    return;
  }

  const targetRect = this.positionTarget.getBoundingClientRect();

  this._scroller.style.maxHeight =
    (window.ShadyCSS
      ? window.ShadyCSS.getComputedStyleValue(this, '--vaadin-combo-box-overlay-max-height')
      : getComputedStyle(this).getPropertyValue('--vaadin-combo-box-overlay-max-height')) || '41vh';

  const maxHeight = this._maxOverlayHeight(targetRect);

  // overlay max height is restrained by the #scroller max height which is set to 65vh in CSS.
  this.$.dropdown.$.overlay.style.maxHeight = maxHeight;

  // we need to set height for iron-list to make its `firstVisibleIndex` work correctly.
  this._selector.style.maxHeight = maxHeight;

  this.updateViewportBoundaries();
}
