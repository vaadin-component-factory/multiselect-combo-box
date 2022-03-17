/* eslint-disable no-invalid-this */

// This function is a copy of the _commitvalue in vaadin-combo-box-mixin
// with some changes (see commments)
/** @private */
export function commitValue() {
  const items = this._getOverlayItems();
  if (items && this._focusedIndex > -1) {
    const focusedItem = items[this._focusedIndex];
    if (this.selectedItem !== focusedItem) {
      this.selectedItem = focusedItem;
    }
    // make sure input field is updated in case value doesn't change (i.e. FOO -> foo)
    this._inputElementValue = this._getItemLabel(this.selectedItem);
  } else if (this._inputElementValue === '' || this._inputElementValue === undefined) {
    this.selectedItem = null;

    if (this.allowCustomValue) {
      this.value = '';
    }
  } else {
    const toLowerCase = item => item && item.toLowerCase && item.toLowerCase();

    // Try to find an item whose label matches the input value. A matching item is searched from
    // the filteredItems array (if available) and the selectedItem (if available).
    const itemMatchingByLabel = [...(this.filteredItems || []), this.selectedItem].find(item => {
      return toLowerCase(this._getItemLabel(item)) === toLowerCase(this._inputElementValue);
    });

    if (
      this.allowCustomValue &&
      // to prevent a repetitive input value being saved after pressing ESC and Tab.
      !itemMatchingByLabel
    ) {
      const customValue = this._inputElementValue;

      // Store reference to the last custom value for checking it on focusout.
      this._lastCustomValue = customValue;

      // An item matching by label was not found, but custom values are allowed.
      // Dispatch a custom-value-set event with the input value.
      const e = new CustomEvent('custom-value-set', {
        detail: customValue,
        composed: true,
        cancelable: true,
        bubbles: true
      });
      this.dispatchEvent(e);
      if (!e.defaultPrevented) {
        this._selectItemForValue(customValue);
        this.value = customValue;
      }
    } else if (!this.allowCustomValue && !this.opened && itemMatchingByLabel) {
      // An item matching by label was found, select it.
      this.value = this._getItemValue(itemMatchingByLabel);
    } else {
      // Revert the input value
      this._inputElementValue = this.selectedItem ? this._getItemLabel(this.selectedItem) : this.value || '';
    }
  }

  this._detectAndDispatchChange();

  this._clearSelectionRange();

  if (!this.dataProvider) {
    this.filter = '';
  }
  // BEGIN customize render the label
  this.renderLabel();
  // END customize
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

/** Copy of the _overlaySelectedItemChanged from vaadin-combo-box-mixin **/
export function overlaySelectedItemChanged(e) {
  // stop this private event from leaking outside.
  e.stopPropagation();

  // BEGIN customize
  /** handle the selection **/
  if (!this._isItemChecked(e.detail.item)) {
    this._selectItem(e.detail.item);
  } else {
    this._deselectItem(e.detail.item);
  }
  // END customize

  if (this.opened) {
    this._focusedIndex = this.filteredItems.indexOf(e.detail.item);
    // BEGIN customize
    // this.close();
    // END customize
  } else if (this.selectedItem !== e.detail.item) {
    this.selectedItem = e.detail.item;
    this._detectAndDispatchChange();
  }
  // BEGIN customize
  this.dispatchEvent(new CustomEvent('change', { bubbles: true }));
  // END customize
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

      // refresh the checkbox
      const foundItem = Array.from(this.$.dropdown._scroller.children).find(
        item => item.nodeName === 'VAADIN-COMBO-BOX-ITEM' && item.item === targetItem
      );
      if (foundItem) {
        foundItem.selected = !previousSelection;
      }
    }

    // Do not submit the surrounding form.
    e.preventDefault();

    // Do not trigger global listeners
    e.stopPropagation();
  }
}

// this function is a copy of the _filteredItemsChanged
// see comments for changes
export function filterChanged(filter, itemValuePath, itemLabelPath) {
  if (filter === undefined) {
    return;
  }

  // Scroll to the top of the list whenever the filter changes.
  this.$.dropdown._scrollIntoView(0);
  if (this.items) {
    // BEGIN CHANGES
    // Sort the changes and select the first item not selected
    this.filteredItems = this._filterItems(this.items, filter)
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
    this._focusedIndex = this.filteredItems.findIndex(item => !this._isItemChecked(item));
    // END CHANGES
  } else {
    // With certain use cases (e. g., external filtering), `items` are
    // undefined. Filtering is unnecessary per se, but the filteredItems
    // observer should still be invoked to update focused item.
    this._filteredItemsChanged({ path: 'filteredItems', value: this.filteredItems }, itemValuePath, itemLabelPath);
  }
}

// this function is a copy of the _filteredItemsChanged
// see comments for changes
/** @private */
export function _filteredItemsChanged(e) {
  if (e.path === 'filteredItems' || e.path === 'filteredItems.splices') {
    this._setOverlayItems(this.filteredItems);
    // BEGIN CHANGES
    // SELECT THE FIRST ITEM NOT SELECTED
    const filterIndex = this.$.dropdown.indexOfLabel(this.filter);
    if (this.opened) {
      const focusedIndex = this.filteredItems.findIndex(item => !this._isItemChecked(item));
      if (focusedIndex > 0) {
        this._focusedIndex = focusedIndex;
      } else {
        this._focusedIndex = filterIndex;
      }
    } else {
      if (this.filteredItems) {
        const valueIndex = this.filteredItems.findIndex(item => !this._isItemChecked(item));
        this._focusedIndex = filterIndex === -1 ? valueIndex : filterIndex;
      } else {
        // Pre-select item matching the filter to focus it later when overlay opens
        const valueIndex = this._indexOfValue(this.value, this.filteredItems);
        this._focusedIndex = filterIndex === -1 ? valueIndex : filterIndex;
      }
    }
    // END CHANGES

    // see https://github.com/vaadin/web-components/issues/2615
    if (this.selectedItem === null && this._focusedIndex >= 0) {
      const filteredItem = this.filteredItems[this._focusedIndex];
      if (this._getItemValue(filteredItem) === this.value) {
        this._selectItemForValue(this.value);
      }
    }
  }
}

// this function is a copy of the _itemsOrPathsChanged
// see comments for changes
/** @private */
export function _itemsOrPathsChanged(e) {
  if (e.path === 'items' || e.path === 'items.splices') {
    if (this.items) {
      this.filteredItems = this.items.slice(0);
    } else if (this.__previousItems) {
      // Only clear filteredItems if the component had items previously but got cleared
      this.filteredItems = null;
    }

    if (this._lastSelectedIndex > -1) {
      this._focusedIndex = this._lastSelectedIndex;
      this._lastSelectedIndex = -1;
    } else {
      const valueIndex = this._indexOfValue(this.value, this.items);
      this._focusedIndex = valueIndex;

      const item = valueIndex > -1 && this.items[valueIndex];
      if (item) {
        this.selectedItem = item;
      }
    }
  }
  this.__previousItems = e.value;
}
