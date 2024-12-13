import { fixture, test, Selector } from 'testcafe';

fixture('UIX Host App')
    .page('./');

test('Check response from guest app', async t => {
    const guestMessageButton = Selector('#get-guest-message-button');
    await t.click(guestMessageButton);

    const guestMessage = Selector('#get-guest-message-result').innerText;
    await t.expect(guestMessage).ok();
});

test('Set message from host', async t => {
    await t
        .click('#set-message-from-host')
        .switchToIframe('#iframe-for-guest');
        
    const textParagraph = Selector('#text-from-host').exists;
    await t.expect(textParagraph).ok();
});
