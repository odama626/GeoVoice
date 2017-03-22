function validatePasswordsMatch() {
	
}

function switchToTemplate(templateSelector) {
  var form = document.querySelector(templateSelector);
  var clone = document.importNode(form.content, true);
  $('#card-area').html(clone);
}



switchToTemplate('#signin-form-template');
