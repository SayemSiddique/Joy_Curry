/**
 * Creates the Joy Curry bug-report form.
 *
 * HOW TO USE (one time, ~2 minutes):
 *   1. Go to https://script.google.com  →  New project
 *   2. Delete whatever is in the editor, paste this whole file in
 *   3. Press Run (▶). Approve the permissions prompt when Google asks.
 *   4. Open View → Logs. Your two links are printed there:
 *        - EDIT link  (for you)
 *        - SHARE link (paste this into TESTER_GUIDE.md)
 */

function createTesterForm() {
  var form = FormApp.create('Joy Curry — Report a Problem');

  form.setDescription(
    'Found something broken, confusing, or slow? Tell us here.\n\n' +
    'One report per problem, please. Small issues are worth reporting — ' +
    'that is exactly what we are looking for.'
  );

  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Thank you! Your report has been sent. ' +
    'Found something else? Just submit the form again.'
  );
  form.setShowLinkToRespondAgain(true);

  // --- Who / where ------------------------------------------------------

  form.addTextItem()
    .setTitle('Your name')
    .setHelpText('So we can follow up if we need more detail.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Were you on a phone or a computer?')
    .setChoiceValues(['Phone', 'Computer / laptop', 'Tablet'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Which device?')
    .setHelpText('Example: iPhone 13, Samsung S23, Windows laptop, MacBook. A rough answer is fine.')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Which browser?')
    .setChoiceValues(['Chrome', 'Safari', 'Edge', 'Firefox', 'Samsung Internet'])
    .showOtherOption(true)
    .setRequired(true);

  // --- What happened ----------------------------------------------------

  form.addPageBreakItem()
    .setTitle('What went wrong')
    .setHelpText('Answer these in plain English — no technical words needed.');

  form.addMultipleChoiceItem()
    .setTitle('Which part of the website?')
    .setChoiceValues([
      'Signing up / signing in',
      'Browsing the menu',
      'Cart',
      'Checkout / payment',
      'My orders / order tracking',
      'My account page',
      'Help, Privacy, Terms or other page',
      'Something else / not sure'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('What were you trying to do?')
    .setHelpText('Example: "add butter chicken to my cart"')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('What did you do, step by step?')
    .setHelpText('Example: "opened the menu → tapped butter chicken → tapped Add to cart"')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('What did you expect to happen?')
    .setHelpText('Example: "it should have gone into my cart"')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('What actually happened?')
    .setHelpText('Example: "nothing happened, the button just went grey"')
    .setRequired(true);

  // --- Severity ---------------------------------------------------------

  form.addMultipleChoiceItem()
    .setTitle('How bad was it?')
    .setChoiceValues([
      'It completely stopped me — I could not continue',
      'Annoying, but I found a way around it',
      'Just looks wrong (text cut off, image missing, ugly)',
      'It worked, but it was confusing',
      'It worked, but it was slow'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Did it happen more than once?')
    .setChoiceValues([
      'Yes — it happens every time',
      'It happened once, I did not try again',
      'I tried again and it worked fine the second time'
    ])
    .setRequired(true);

  // --- Evidence ---------------------------------------------------------

  form.addPageBreakItem()
    .setTitle('Screenshot')
    .setHelpText(
      'A screenshot helps us more than anything else.\n\n' +
      'iPhone: Side button + Volume Up\n' +
      'Android: Power + Volume Down\n' +
      'Windows: Windows key + Shift + S\n' +
      'Mac: Shift + Command + 4'
    );

  var upload = form.addFileUploadItem()
    .setTitle('Attach a screenshot or screen recording')
    .setHelpText('Optional, but please add one if you can.')
    .setRequired(false);
  upload.setMaxFiles(3);
  upload.setMaxFileSize(1024 * 1024 * 25); // 25 MB

  form.addParagraphTextItem()
    .setTitle('Anything else you want to tell us?')
    .setHelpText('Ideas, things that felt off, or anything that confused you.')
    .setRequired(false);

  // --- Responses spreadsheet -------------------------------------------

  var sheet = SpreadsheetApp.create('Joy Curry — Tester Reports');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('EDIT the form here:   ' + form.getEditUrl());
  Logger.log('SHARE this link:      ' + form.getPublishedUrl());
  Logger.log('Responses land here:  ' + sheet.getUrl());
}
