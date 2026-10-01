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

  // Minimal falling-petal effect to match the wedding-invitation aesthetic.
  const petals=document.createElement("div");
  petals.className="falling-petals";
  petals.setAttribute("aria-hidden","true");
  document.body.appendChild(petals);

  const symbols=["✿","❀","❁","·"];
  const count=7;
  for(let i=0;i<count;i++){
    const petal=document.createElement("span");
    petal.className="falling-petal";
    petal.textContent=symbols[Math.floor(Math.random()*symbols.length)];
    petal.style.left=(Math.random()*100)+"vw";
    petal.style.animationDelay=(Math.random()*10)+"s";
    petal.style.animationDuration=(13+Math.random()*10)+"s";
    petal.style.fontSize=(7+Math.random()*7)+"px";
    petal.style.opacity=(0.18+Math.random()*0.28).toFixed(2);
    petal.style.setProperty("--drift",(Math.random()*70-35)+"px");
    petals.appendChild(petal);
  }

  // Subtle floating wedding-ring outlines.
  const rings=document.createElement("div");
  rings.className="wedding-rings";
  rings.setAttribute("aria-hidden","true");
  document.body.appendChild(rings);

  for(let i=0;i<3;i++){
    const ring=document.createElement("span");
    ring.className="wedding-ring";
    ring.style.left=(12+Math.random()*76)+"vw";
    ring.style.top=(18+Math.random()*65)+"vh";
    ring.style.animationDelay=(Math.random()*12)+"s";
    ring.style.animationDuration=(17+Math.random()*8)+"s";
    ring.style.transform="scale("+(0.75+Math.random()*0.5).toFixed(2)+") rotate(-25deg)";
    rings.appendChild(ring);
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