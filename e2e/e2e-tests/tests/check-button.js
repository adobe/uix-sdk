import { fixture, test, Selector } from 'testcafe';
import XPathSelector from '../selectors/xpath-selector';

fixture('UIX Host App')
    .page('./');

test('Check custom button', async t => {

    const submitButtonExists = Selector('#custom-header-button').exists;

    await t.expect(submitButtonExists).ok();

    await t.click('#custom-header-button');

    const dialog = Selector('#custom-header-button-dialog').exists;

    await t.expect(dialog).ok();

    const header = XPathSelector('//*[@id="custom-header-button-dialog"]//h2').exists;
    await t.expect(header).ok();

    const closeModal = XPathSelector('//*[@id="custom-header-button-dialog"]/div/button[@aria-label=\'Dismiss\']')

    await t.click(closeModal);

    await t.expect(dialog).notOk();
});
