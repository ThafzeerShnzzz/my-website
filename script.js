document.addEventListener("DOMContentLoaded",function(){
  const button=document.querySelector(".menu");
  const menu=document.querySelector(".links");
  if(button&&menu){
    button.addEventListener("click",function(){
      menu.classList.toggle("mobile-open");
      button.textContent=menu.classList.contains("mobile-open")?"✕":"☰";
    });
    menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>menu.classList.remove("mobile-open")));
  }
});
function submitRSVP(e){
  e.preventDefault();
  const f=e.target;
  const name=f.name.value;
  const success=document.getElementById("success");
  if(success) success.textContent="Thank you, "+name+". Your RSVP has been recorded on this device.";
  f.reset();
}