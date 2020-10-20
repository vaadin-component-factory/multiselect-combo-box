/* eslint-disable no-invalid-this */

export function renderer(root, owner, model) {
  let labelText = '';
  if (!(typeof model.item === 'string')) {
    labelText = model.item[this.itemLabelPath];
  } else {
    labelText = model.item;
  }
  if (root.firstElementChild) {
    root.innerHTML = '';
  }
  const itemNode = document.createElement('div');
  const itemCheckbox = document.createElement('vaadin-checkbox');
  itemCheckbox.checked = this._isItemChecked(model.item) ? true : false;
  itemCheckbox.addEventListener('change', () => {
    if (itemCheckbox.checked) {
      this.selectedItems = [...this.selectedItems, model.item];
    } else {
      const itemIndex = this.selectedItems.findIndex(i => {
        if (typeof model.item === 'string') {
          return i === model.item;
        } else {
          return i[this.itemValuePath] === model.item[this.itemValuePath];
        }
      });
      this.selectedItems = [...this.selectedItems.slice(0, itemIndex), ...this.selectedItems.slice(itemIndex + 1)];
    }

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
  });
  itemNode.appendChild(itemCheckbox);
  itemNode.appendChild(document.createTextNode(labelText));
  root.appendChild(itemNode);
}

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
    } else {
      // this._inputElementValue = this.selectedItem ? this._getItemLabel(this.selectedItem) : (this.value || '');
    }
  }

  this._detectAndDispatchChange();

  this._clearSelectionRange();

  if (!this.dataProvider) {
    this.filter = '';
  }
}

export function overlaySelectedItemChanged(e) {
  // stop this private event from leaking outside.
  e.stopPropagation();

  if (this.opened) {
    this._focusedIndex = this.filteredItems.indexOf(e.detail.item);
  } else if (this.selectedItem !== e.detail.item) {
    this.selectedItem = e.detail.item;
    this._detectAndDispatchChange();
  }
}
