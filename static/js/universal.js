var user = {
  validatePassword: function() {
    var pass = document.getElementById('password');
    var passVer = document.getElementById('retype-password');
    var submit = document.getElementById('sign-up');

    if (pass.value == passVer.value) {
      submit.disabled = false;
      passVer.parentElement.classList.remove('is-invalid');
    } else {
      var label = document.getElementById('retype-password-error');
      label.innerHTML = 'passwords don\'t match';
      passVer.parentElement.classList.add('is-invalid');
      passVer.onkeypress = this.validatePassword;
    }
  }
}
