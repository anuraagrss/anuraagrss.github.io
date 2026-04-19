document.querySelector('.contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const name = this.name.value;
  const email = this.email.value;
  const message = this.message.value;
  const subject = encodeURIComponent("Contact Form Message from " + name);
  const body = encodeURIComponent("Name: " + name + "\nEmail: " + email + "\n\nMessage:\n" + message);
  window.location.href = `mailto:rssanuraag@gmail.com?subject=${subject}&body=${body}`;
});
