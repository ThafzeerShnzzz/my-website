document.querySelector('.menu')?.addEventListener('click',()=>document.querySelector('.links').classList.toggle('open'));
function submitRSVP(e){e.preventDefault();const f=e.target;const name=f.name.value;document.getElementById('success').textContent=`Thank you, ${name}. Your RSVP has been recorded on this device. Connect this form to Google Forms/Formspree before publishing for real submissions.`;f.reset();}
const menuButton = document.querySelector('.menu');
const navLinks = document.querySelector('.links');

menuButton.addEventListener('click', () => {
  navLinks.classList.toggle('mobile-open');
});
