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

  static get is() {
    return 'vcf-multiselect-combo-box';
  }

  static get version() {
    return '1.0.0';
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
