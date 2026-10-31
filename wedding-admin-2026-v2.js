function renderFocAssignments(){const el=q('focAssignments');if(!el)return;const guests=data.filter(x=>focCodes.has(x.registration_code));el.innerHTML=guests.length?guests.map(x=>'<div class="foc-assignment"><span><strong>'+esc(x.Name||'Guest')+'</strong> · '+esc(x.registration_code||'')+'</span><button type="button" class="foc-role-badge" onclick="openFocRole('+x.id+')">'+esc(focRoles.get(x.registration_code)||'Set FOC role')+'</button></div>').join(''):'<p>No FOC guests assigned yet.</p>';}
function openPendingWhatsApp(id){const x=data.find(v=>v.id===id);if(!x)return;let n=String(x.Whatsapp||'').replace(/\D/g,'');if(n.startsWith('00'))n=n.slice(2);if(n.startsWith('0'))n='971'+n.slice(1);if(!n){alert('WhatsApp number is missing for this guest.');return;}window.open('https://wa.me/'+n,'_blank','noopener');}
function renderReviewQueue(){
 const list=q('reviewQueueList'),count=q('reviewQueueCount');if(!list||!count)return;
 const pendingGuests=data.filter(x=>x['Payment status']==='verification_pending');
 count.textContent=pendingGuests.length+' pending';
 list.innerHTML=pendingGuests.length?pendingGuests.map(x=>'<article class="review-queue-card"><div class="review-queue-top"><span class="review-queue-id">'+esc(x.registration_code||'—')+'</span><span class="review-queue-flag">WAITING REVIEW</span></div><div class="review-queue-name">'+esc(x.Name||'Unnamed guest')+'</div><div class="review-queue-meta">'+esc(x.care_of?'C/O · '+x.care_of:'C/O · —')+'<br>'+esc(x.Whatsapp||'—')+'</div><div class="review-queue-actions"><button type="button" class="btn reject" onclick="openGuestDetails('+x.id+')">VIEW</button><button type="button" class="btn wa" onclick="openPendingWhatsApp('+x.id+')">WHATSAPP</button><button type="button" class="btn" onclick="statusSet('+x.id+',\'approved\')">APPROVE</button></div></article>').join(''):'<div class="review-queue-empty">All caught up. No new registrations waiting for review.</div>';
}

let teams=new Map(),teamsReady=false;
const teamLabels={bride:"Bride",groom:"Groom",other:"Other",unassigned:"Unassigned"};
let paymentMethods=new Map(),paymentMethodsReady=false,paymentModeGuestId=null,paymentModeBusy=false;

let payLater=new Map(),payLaterReady=false,payLaterGuestId=null,payLaterBusy=false;
function isPayLater(x){return payLater.has(x.registration_code)&&!payLater.get(x.registration_code).paid_at}
function matchesGuestType(x){
 const type=q('guestType').value;
 return type==='all'||(type==='foc'?focReady&&focCodes.has(x.registration_code):type==='later'?payLaterReady&&isPayLater(x):focReady&&payLaterReady&&x['Payment status']==='approved'&&!focCodes.has(x.registration_code)&&!isPayLater(x));
}
function renderGuestCounts(){
 const approved=data.filter(x=>x['Payment status']==='approved');
 q('confirmedTotal').textContent=approved.length;
 q('paidTotal').textContent=focReady&&payLaterReady?approved.filter(x=>!focCodes.has(x.registration_code)&&!isPayLater(x)).length:'—';
 if(q('laterTotal'))q('laterTotal').textContent=payLaterReady?approved.filter(isPayLater).length:'—';
 q('focTotal').textContent=focReady?approved.filter(x=>focCodes.has(x.registration_code)).length:'—';
 q('guestCountNote').textContent=focReady&&payLaterReady?'Approved registrations only. Paid excludes FOC and Pay Later.':!payLaterReady?'Pay Later setup is unavailable. Run admin-pay-later-setup.sql in Supabase, then refresh. Paid totals are hidden until payment details are available.':'FOC details could not be loaded. Refresh before using guest type counts or filters.';

}
const U='https://fbdkfzstxufvmjnkzzif.supabase.co',K='sb_publishable_X1jt3-YBCSZ0Pmk0cMV4ng_TqN9LNYm';let token=sessionStorage.getItem('okp_admin_token'),data=[],focCodes=new Set(),focReady=false;const q=x=>document.getElementById(x),esc=x=>String(x??'').replace(/[&<>"]/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[a]));if(!token)location.replace('admin-v2.html');async function load(){q('msg').textContent='Loading registrations...';try{let r=await fetch(U+'/rest/v1/registrations?select=*&order=id.desc',{headers:{apikey:K,Authorization:'Bearer '+token}});if(r.status===401){sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html');return}if(!r.ok)throw Error(await r.text());data=await r.json();await loadFocFlags();await loadFocRoles();await loadPayLater();await loadAdminPaymentNotes();await loadPaymentMethods();await loadTeams();q('msg').textContent='';render()}catch(e){q('msg').textContent='LOAD ERROR: '+e.message}}function render(){renderFocAssignments();renderGuestCounts();renderTeamCounts();q('total').textContent=data.length;q('pending').textContent=data.filter(x=>x['Payment status']==='verification_pending').length;q('approved').textContent=data.filter(x=>x['Payment status']==='approved').length;q('rejected').textContent=data.filter(x=>x['Payment status']==='rejected').length;let pc=data.filter(x=>x['Payment status']==='verification_pending').length;let at=q('actionText');if(at)at.textContent=pc?pc+' payment'+(pc===1?' is':'s are')+' waiting for verification 👀':'All caught up — no payments waiting 🎉';let s=q('search').value.toLowerCase(),f=q('filter').value,a=data.filter(x=>matchesTeam(x)&&matchesGuestType(x)&&(f==='all'||x['Payment status']===f)&&[x.registration_code,x.Name,x.Whatsapp,x.care_of,x.payment_reference].some(v=>String(v??'').toLowerCase().includes(s)));q('rows').innerHTML=a.map(x=>{
 const foc=focCodes.has(x.registration_code),later=isPayLater(x),method=paymentMethods.get(x.registration_code),status=x['Payment status'];
 const note=adminPaymentNotes.get(x.registration_code)||{},due=note.due_date||(later?payLater.get(x.registration_code)?.due_date:'')||'';
 const team=teams.get(x.registration_code)||'unassigned',role=focRoles.get(x.registration_code)||'';
 const state=foc?'FOC':later?'Pay Later':method?'Paid':status==='rejected'?'Rejected':'Pending';
 const stateClass=foc?'foc':later?'later':method?'paid':status==='rejected'?'rejected':'pending';
 const ref=String(x.payment_reference||'').trim();
 return '<tr><td data-label="OKP ID" class="id-cell">'+esc(x.registration_code)+'</td>'+
 '<td data-label="NAME" class="name-cell"><strong>'+esc(x.Name)+'</strong>'+guestNameIndicator(x,foc,later,method)+'</td>'+
 '<td data-label="C/O">'+esc(x.care_of||'—')+'</td>'+
 '<td data-label="TEAM"><button class="team-badge team-'+esc(team)+'" onclick="openGuestTeam('+x.id+')">'+esc(teamLabels[team]||'Unassigned')+'⌄</button></td>'+
 '<td data-label="PAYMENT STATUS"><button class="payment-state '+stateClass+'" onclick="'+(foc?'openFocRole('+x.id+')':later?'openAdminPaymentNote('+x.id+')':method?'openPaymentMode('+x.id+')':'openAdminPaymentNote('+x.id+')')+'()"><i></i>'+state+'</button></td>'+
 
 
 '<td data-label="APPROVAL"><button class="approval-badge '+(status==='approved'?'yes':status==='rejected'?'no':'wait')+'" onclick="openGuestDetails('+x.id+')">'+(status==='approved'?'Approved':status==='rejected'?'Rejected':'Review')+'</button></td>'+
 '<td data-label="DUE DATE" class="due-cell">'+(due?esc(due):'—')+'</td>'+
 '<td data-label="ACTIONS" data-guest-id="'+x.id+'" class="action-cell">'+(status==='verification_pending'?'<span class="pending-inline-actions"><button class="btn review-action" onclick="openGuestDetails('+x.id+')"><span class="review-alert" aria-hidden="true">⚠</span> REVIEW</button><button class="btn wa" onclick="openPendingWhatsApp('+x.id+')">WHATSAPP</button><button class="btn" onclick="statusSet('+x.id+',\'approved\')">APPROVE</button></span>':status==='approved'?'<button class="btn small review-action" onclick="openGuestDetails('+x.id+')">VIEW</button><button class="btn small wa" onclick="openApprovalWhatsAppById('+x.id+')">WHATSAPP</button>':'<button class="btn small review-action" onclick="openGuestDetails('+x.id+')">VIEW</button>')+guestActionMenu(x)+'</td></tr>';
 }).join('');
 if(!a.length)q('rows').innerHTML='<tr><td colspan="9">No registrations found.</td></tr>';
}let adminPaymentNotes=new Map(),adminPaymentNotesReady=false,adminPaymentNoteBusy=false,adminPaymentNoteGuestId=null;
async function loadAdminPaymentNotes(){
 adminPaymentNotesReady=false;adminPaymentNotes=new Map();
 try{
  const r=await fetch(U+'/rest/v1/okp_admin_payment_notes?select=registration_code,note,due_date',{headers:{apikey:K,Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('Payment notes setup required');
  adminPaymentNotes=new Map((await r.json()).map(x=>[x.registration_code,x]));adminPaymentNotesReady=true;
 }catch(e){console.warn('Payment notes require admin-payment-notes-setup.sql');}
}
function adminPaymentNoteBadge(x){
 const item=adminPaymentNotes.get(x.registration_code);if(!item||(!item.note&&!item.due_date))return '';
 return '<div class="admin-payment-note" title="'+esc(item.note||'')+'">'+(item.note?'<span>'+esc(item.note)+'</span>':'')+(item.due_date?'<small>Due '+esc(item.due_date)+'</small>':'')+'</div>';
}
function openAdminPaymentNote(id){
 const x=data.find(v=>v.id===id);if(!x)return;
 if(!adminPaymentNotesReady){alert('Payment notes storage is not configured yet. Run admin-payment-notes-setup.sql in Supabase SQL Editor and refresh.');return;}
 adminPaymentNoteGuestId=id;
 const current=adminPaymentNotes.get(x.registration_code)||{};
 q('adminPaymentNoteGuest').textContent=x.Name+' · '+x.registration_code;
 q('adminPaymentNoteText').value=current.note||'';
 q('adminPaymentNoteDate').value=current.due_date||'';
 q('adminPaymentNoteError').textContent='';
 q('adminPaymentNoteDialog').showModal();
}
q('adminPaymentNoteCancel').onclick=()=>{if(!adminPaymentNoteBusy)q('adminPaymentNoteDialog').close()};
q('adminPaymentNoteDialog').addEventListener('cancel',e=>{if(adminPaymentNoteBusy)e.preventDefault()});
q('adminPaymentNoteForm').onsubmit=async e=>{
 e.preventDefault();if(adminPaymentNoteBusy)return;
 const x=data.find(v=>v.id===adminPaymentNoteGuestId);if(!x)return;
 const note=q('adminPaymentNoteText').value.trim(),due=q('adminPaymentNoteDate').value;
 adminPaymentNoteBusy=true;q('adminPaymentNoteSave').disabled=true;q('adminPaymentNoteError').textContent='Saving...';
 try{
  const r=await fetch(U+'/rest/v1/okp_admin_payment_notes?on_conflict=registration_code',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({registration_code:x.registration_code,note,due_date:due||null})});
  if(!r.ok)throw Error((await r.text()).slice(0,350));
  adminPaymentNotes.set(x.registration_code,{note,due_date:due||null});q('adminPaymentNoteDialog').close();render();
 }catch(err){q('adminPaymentNoteError').textContent='Could not save: '+err.message}
 finally{adminPaymentNoteBusy=false;q('adminPaymentNoteSave').disabled=false}
};
let focRoles=new Map(),focRolesReady=false,focRoleBusy=false;
async function loadFocRoles(){
 focRolesReady=false;focRoles=new Map();
 try{const r=await fetch(U+'/rest/v1/okp_admin_foc_roles?select=registration_code,role',{headers:{apikey:K,Authorization:'Bearer '+token}});
 if(!r.ok)throw Error('FOC role setup needed');focRoles=new Map((await r.json()).map(x=>[x.registration_code,x.role]));focRolesReady=true;}
 catch(e){console.warn('Run admin-foc-roles-setup.sql for role editing');}
}
function openFocRole(id){
 const x=data.find(v=>v.id===id);if(!x||!focCodes.has(x.registration_code))return;
 if(!focRolesReady){alert('FOC roles need one-time Supabase setup: admin-foc-roles-setup.sql');return;}
 q('focRoleGuest').textContent=x.Name+' · '+x.registration_code;
 const role=focRoles.get(x.registration_code)||'';
 q('focRoleSelect').value=['OKP Photographer','OKP Video Team','OKP Flower Girl','OKP Dance Team'].includes(role)?role:(role?'Other':'');
 q('focRoleOther').value=q('focRoleSelect').value==='Other'?role:'';
 q('focRoleOther').hidden=q('focRoleSelect').value!=='Other';
 q('focRoleError').textContent='';q('focRoleDialog').showModal();q('focRoleDialog').dataset.guestId=String(id);
}
q('focRoleSelect').onchange=()=>{q('focRoleOther').hidden=q('focRoleSelect').value!=='Other'};
q('focRoleCancel').onclick=()=>{if(!focRoleBusy)q('focRoleDialog').close()};
q('focRoleForm').onsubmit=async e=>{
 e.preventDefault();if(focRoleBusy)return;
 const x=data.find(v=>v.id===Number(q('focRoleDialog').dataset.guestId));if(!x)return;
 const role=(q('focRoleSelect').value==='Other'?q('focRoleOther').value:q('focRoleSelect').value).trim();
 if(!role)return;
 focRoleBusy=true;q('focRoleSave').disabled=true;q('focRoleError').textContent='Saving...';
 try{const r=await fetch(U+'/rest/v1/okp_admin_foc_roles?on_conflict=registration_code',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({registration_code:x.registration_code,role})});
 if(!r.ok)throw Error((await r.text()).slice(0,250));focRoles.set(x.registration_code,role);q('focRoleDialog').close();render();}
 catch(err){q('focRoleError').textContent=err.message}finally{focRoleBusy=false;q('focRoleSave').disabled=false}
};
function guestNameIndicator(x,foc,later,method){
 const status=x['Payment status'];
 const type=foc?'foc':later?'later':status==='approved'&&method?'paid':status==='rejected'?'rejected':'pending';
 const labels={paid:'Payment received',later:'Approved · Pay Later',foc:'Complimentary guest',rejected:'Registration rejected',pending:'Awaiting verification'};
 const paths={
 paid:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16 9.5"/>',
 later:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 pending:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/><circle cx="19" cy="5" r="2.5" fill="currentColor" stroke="none"/>',
 foc:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
 rejected:'<path d="M5 5 19 19M19 5 5 19"/>'
 };
 return '<span class="guest-name-indicator guest-name-indicator--'+type+'" role="img" aria-label="'+labels[type]+'" title="'+labels[type]+'"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+paths[type]+'</svg></span>';
}
function guestActionMenu(x){
 const id=x.id,code=esc(x.registration_code),items=[];
 const add=(label,call,kind='')=>items.push('<button type="button" class="guest-menu-item '+kind+'" onclick="this.closest(\'details\').open=false;'+call+'">'+label+'</button>');
 const section=label=>items.push('<div class="guest-menu-section">'+label+'</div>');
 add('Guest Details','openGuestDetails('+id+')');
 if(x['Payment status']==='approved')add('Invite / Admit Card','openInvitationById('+id+')');
 section('PAYMENT');
 if(paymentMethodsReady&&focReady&&!focCodes.has(x.registration_code))add(isPayLater(x)?'Record Payment':'Set Payment Mode','openPaymentMode('+id+')');
 if(payLaterReady&&focReady&&!focCodes.has(x.registration_code)){
  if(isPayLater(x)){add('Edit Pay Later Date','openPayLater('+id+')');if(x['Payment status']==='approved')add('Mark Paid','markLaterPaid('+id+')')}
  else add('Pay Later','openPayLater('+id+')');
 }
 add('Payment Due Date / Note','openAdminPaymentNote('+id+')');
 section('PAYMENT PROOF');
 if(x.payment_proof)add('View Payment Proof','proof(\''+encodeURIComponent(x.payment_proof)+'\')');
 add('Upload Payment Proof','openAdminProofUpload('+id+')');
 section('GUEST MANAGEMENT');
 if(focCodes.has(x.registration_code))add('Set FOC Role','openFocRole('+id+')');
 if(teamsReady)add('Edit Team','openGuestTeam('+id+')');
 if(x['Payment status']!=='approved')add('Approve Registration','statusSet('+id+',\'approved\')');
 if(x['Payment status']!=='rejected')add('Reject Registration','statusSet('+id+',\'rejected\')');
 section('OTHER');
 add('Delete Guest','deleteRow('+id+',\''+code+'\')','danger');
 return '<details class="guest-menu"><summary aria-label="Actions for '+esc(x.Name)+'" title="More actions">⋯</summary><div class="guest-menu-pop"><div class="guest-menu-title">Guest Actions<small>'+esc(x.registration_code)+' · '+esc(x.Name)+'</small></div>'+items.join('')+'</div></details>';
}
function openGuestTeam(id){
 const x=data.find(v=>v.id===id);if(!x)return;
 q('guestTeamGuest').textContent=x.Name+' · '+x.registration_code;
 q('guestTeamSelect').innerHTML=Object.entries(teamLabels).map(([key,label])=>'<option value="'+esc(key)+'">'+esc(label)+'</option>').join('');
 q('guestTeamSelect').value=teams.get(x.registration_code)||'unassigned';
 q('guestTeamDialog').showModal();
 q('guestTeamSave').onclick=async()=>{await saveTeam(id,q('guestTeamSelect'));q('guestTeamDialog').close()};
}
function openGuestDetails(id){
 const x=data.find(v=>v.id===id);if(!x)return;
 q('guestDetailsTitle').textContent=x.Name+' · '+x.registration_code;
 q('guestDetailsBody').innerHTML=[
 ['WhatsApp',x.Whatsapp],['Care of',x.care_of],['RSVP preference',x.Preferred_family],['Heard about us',x.how_u_heard_about_us],['New to community',x.new_to_our_Community],
 ['Assigned team',teamLabels[teams.get(x.registration_code)||'unassigned']||'Unassigned'],
 ['Payment reference',x.payment_reference],['Payment method',paymentMethods.get(x.registration_code)||'—'],
 ['Payment proof',x.payment_proof?'Uploaded — ready to review':'Not uploaded'],
 ['Payment note',adminPaymentNotes.get(x.registration_code)?.note||'—'],['Due date',adminPaymentNotes.get(x.registration_code)?.due_date||payLater.get(x.registration_code)?.due_date||'—'],['FOC role',focRoles.get(x.registration_code)||'—'],['Approval',x['Payment status']||'—']
 ].map(([k,v])=>'<div class="detail-row"><span>'+esc(k)+'</span><strong>'+esc(v||'—')+'</strong></div>').join('')+'<div class="detail-row"><span>Payment proof actions</span><strong>'+(x.payment_proof?'<button type="button" class="btn reject" onclick="proof(\''+encodeURIComponent(x.payment_proof)+'\')">VIEW PROOF</button> ':'')+'<button type="button" class="btn" onclick="openAdminProofUpload('+x.id+')">UPLOAD PROOF</button></strong></div>';
 q('guestDetailsBody').innerHTML+='<div class="review-note"><strong>RSVP Note</strong><div>'+esc(x.payment_reference||'—')+'</div></div>'+(x['Payment status']==='verification_pending'?'<div class="review-footer"><button class="btn wa" onclick="openPendingWhatsApp('+x.id+')">WHATSAPP</button><button class="btn" onclick="document.getElementById(\'guestDetailsDialog\').close();statusSet('+x.id+',\'approved\')">APPROVE</button><button class="btn reject" onclick="document.getElementById(\'guestDetailsDialog\').close();statusSet('+x.id+',\'rejected\')">REJECT</button></div>':'');q('guestDetailsDialog').showModal();
}
function focusGuestTeam(id){const row=[...document.querySelectorAll('#rows tr')].find(tr=>tr.querySelector('[data-guest-id="'+id+'"]'));const select=row?.querySelector('.assigned-team');if(select){select.scrollIntoView({block:'center',behavior:'smooth'});select.focus()}else alert('Use the assigned team dropdown for this guest.')}
document.addEventListener('click',e=>{document.querySelectorAll('.guest-menu[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})});
function copyId(v){navigator.clipboard.writeText(v).then(()=>{}).catch(()=>{});}async function statusSet(id,s){if(s==='approved'&&paymentMethodsReady&&!focCodes.has(data.find(x=>x.id===id)?.registration_code)){openPaymentMode(id);return;}if(data.some(x=>x.id===id&&x['Payment status']===s))return;if(!confirm((s==='approved'?'Approve':'Reject')+' this registration?'))return;let x=data.find(v=>v.id===id);let wa=null;if(s==='approved'&&x){let d=String(x.Whatsapp??'').replace(/\D/g,'');if(d.startsWith('0'))d='971'+d.slice(1);if(d){let m='💌 *O.K.P · WEDDING HOUSE*\n\nHey *'+(x.Name||'')+'!*\n*You’re officially on the guest list! ❤️*\n\nRegistration confirmed ✓\nRegistration ID: *'+(x.registration_code||'')+'*\n\nKeep your ID safe — you’ll need it at the Wedding House. 😉\n\n*See you at O.K.P! ✨*\n\n_Oru Kalyanam Pole_\nIsteda Community';wa=window.open('https://wa.me/'+d+'?text='+encodeURIComponent(m),'_blank')}}let r=await fetch(U+'/rest/v1/registrations?id=eq.'+id,{method:'PATCH',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({'Payment status':s})});if(!r.ok){alert('Update failed: '+await r.text());return}if(x)x['Payment status']=s;render();if(s==='approved'&&x&&!wa){alert('Approved ✓\nUse the WHATSAPP button to send confirmation.')}}function openApprovalWhatsAppById(id){let x=data.find(v=>v.id===id);if(x)openApprovalWhatsApp(x)}function openInvitationById(id){let x=data.find(v=>v.id===id);if(x)openInvitation(x)}function openApprovalWhatsApp(x){let d=String(x.Whatsapp??'').replace(/\D/g,'');if(!d){alert('Approved, but this guest has no WhatsApp number.');return}if(d.startsWith('0'))d='971'+d.slice(1);let m='💌 *O.K.P · WEDDING HOUSE*\n\nHey *'+(x.Name||'')+'!*\n*You’re officially on the guest list! ❤️*\n\nRegistration confirmed ✓\nRegistration ID: *'+(x.registration_code||'')+'*\n\nKeep your ID safe — you’ll need it at the Wedding House. 😉\n\n*See you at O.K.P! ✨*\n\n_Oru Kalyanam Pole_\nIsteda Community';window.open('https://wa.me/'+d+'?text='+encodeURIComponent(m),'_blank')}async function deleteRow(id,code){if(!confirm('DELETE '+code+' permanently?\n\nThis cannot be undone.'))return;let r=await fetch(U+'/rest/v1/registrations?id=eq.'+id,{method:'DELETE',headers:{apikey:K,Authorization:'Bearer '+token,Prefer:'return=minimal'}});if(!r.ok){alert('Delete failed. Admin DELETE permission may need to be enabled.\n'+await r.text());return}data=data.filter(x=>x.id!==id);render()}function openInvitation(x){if(!focReady){alert('Guest type could not be verified. Refresh the admin panel before creating the admit card.');return}let isFoc=focCodes.has(x.registration_code);let w=window.open('','_blank');if(!w){alert('Please allow pop-ups to view the invitation.');return}let name=esc(x.Name||'Guest'),code=esc(x.registration_code||''),care=esc(x.care_of||'—'),phone=esc(x.Whatsapp||'—');w.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${code} · O.K.P Admit Card</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Allura&family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet"><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script><style>:root{--paper:#f8efd9;--red:#b20f3b;--red-dark:#8f0c31;--ink:#403322;--gold:#b99a57}*{box-sizing:border-box}html,body{margin:0;background:#efe7d7;color:var(--ink);font-family:'Cormorant Garamond',Georgia,serif}.stage{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}.card{width:108mm;height:171mm;position:relative;overflow:hidden;padding:9mm;background:linear-gradient(135deg,#fbf4e3 0%,var(--paper) 48%,#f5e5c5 100%);box-shadow:none}.card:before{content:"";position:absolute;inset:0;opacity:.13;background-image:radial-gradient(rgba(70,40,15,.35) .35px,transparent .45px),radial-gradient(rgba(255,255,255,.8) .45px,transparent .55px);background-size:5px 5px,9px 9px}.flower{position:absolute;color:rgba(178,15,59,.22);font-size:34pt;line-height:1}.f1{left:-4mm;top:12mm;transform:rotate(-16deg)}.f2{right:-3mm;top:36mm;transform:rotate(18deg)}.f3{left:5mm;bottom:8mm;font-size:23pt}.paper{height:100%;position:relative;z-index:2;border-top:1px solid rgba(178,15,59,.28);border-bottom:1px solid rgba(178,15,59,.28);padding:6mm 5mm 5mm;text-align:center;display:flex;flex-direction:column;align-items:center}.top{font:500 6.5pt 'Montserrat',sans-serif;letter-spacing:3px;color:var(--red-dark)}.logo{width:72mm;max-height:34mm;object-fit:contain;margin:4mm auto 2mm}.stay{font:500 6pt 'Montserrat',sans-serif;letter-spacing:2.7px;color:var(--red-dark)}.script{font:400 27pt Allura,cursive;color:var(--red);margin:3mm 0 0}.headline{font-weight:600;font-size:20pt;line-height:.95;color:var(--red-dark);margin:0}.lead{font-size:10.5pt;line-height:1.4;margin:2mm 0;color:var(--ink)}.name{font-size:23pt;font-weight:600;color:var(--red);line-height:1;margin:1mm 0 2mm}.guestmeta{display:flex;gap:4mm;justify-content:center;align-items:center;font:500 6.5pt 'Montserrat',sans-serif;letter-spacing:.8px;color:var(--red-dark);margin:1mm 0 2mm}.guestmeta span+span{border-left:1px solid rgba(178,15,59,.25);padding-left:4mm}.rule{width:20mm;border-top:1px solid rgba(178,15,59,.35);margin:1mm auto 2mm}.details{width:100%;display:grid;grid-template-columns:1fr 1fr;border-top:1px solid rgba(178,15,59,.22);border-bottom:1px solid rgba(178,15,59,.22);padding:3mm 0;margin-top:1mm}.details>div+div{border-left:1px solid rgba(178,15,59,.18)}.label{font:500 5.5pt 'Montserrat',sans-serif;letter-spacing:1.8px;color:var(--red-dark)}.value{font:600 10.5pt 'Cormorant Garamond',serif;color:var(--ink);margin-top:1.5mm}.confirmed{color:var(--red)}.note{font-style:italic;font-size:9pt;margin:3mm 0 0}.foot{margin-top:auto;width:100%;flex:0 0 auto;padding:0 0 3mm;border:0}.midstamp{margin:4mm auto 2mm!important;flex:0 0 auto}.admit{width:17mm;height:17mm;border:1px solid var(--red);border-radius:50%;display:grid;place-items:center;margin:0 auto;color:var(--red);background:transparent;padding:2mm;font:600 4.3pt/1.2 'Montserrat',sans-serif;letter-spacing:1px;transform:rotate(-5deg);text-align:center}.closing{font-size:8.5pt;margin-top:2mm}.orn{color:var(--red);font-size:11pt;letter-spacing:7px;margin-top:1.5mm}.outfit-stamp-row{display:flex;align-items:center;justify-content:space-between;gap:5mm;width:100%;margin:5mm 0 2mm;flex:0 0 auto}.pack-note{font:500 7pt/1.7 'Montserrat',sans-serif;color:var(--red-dark);text-align:left;margin:0;flex:1;min-width:0}.pack-title{font-size:5.8pt;font-weight:600;letter-spacing:1px;margin-bottom:1mm}.outfit-stamp-row .midstamp{margin:0!important;flex:0 0 17mm}.bottom-note{font:400 6.6pt/1.2 'Cormorant Garamond',Georgia,serif;font-style:italic;color:rgba(64,51,34,.46);margin:0 auto;max-width:76mm;text-align:center}.actions{display:flex;gap:8px;margin-top:16px}.actions button{border:1px solid var(--red-dark);padding:11px 15px;font:600 9px 'Montserrat',sans-serif;letter-spacing:1px;cursor:pointer}.share{background:var(--red);color:var(--paper)}.print{background:var(--paper);color:var(--red-dark)}@page{size:108mm 171mm;margin:0}@media print{html,body{width:108mm;height:171mm;background:var(--paper)!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.stage{display:block;min-height:0;padding:0}.card{width:108mm;height:171mm;margin:0;box-shadow:none;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.actions{display:none}}</style></head><body><div class="stage"><div class="card"><span class="flower f1">❀</span><span class="flower f2">❀</span><span class="flower f3">✿</span><div class="paper"><div class="top">ISTEDA COMMUNITY PRESENTS</div><img src="okp1.png" class="logo"><div class="stay">STAYCATION 3.0 · WEDDING HOUSE</div><div class="script">You’re invited</div><div class="headline">to our little wedding universe.</div><div class="lead">A place has been kept for</div><div class="name">${name}</div><div class="guestmeta"><span>C/O&nbsp; ${care}</span><span>${phone}</span></div><div class="rule"></div><div class="details"><div><div class="label">REGISTRATION</div><div class="value">${code}</div></div><div><div class="label">STATUS</div><div class="value confirmed">CONFIRMED ✓</div></div></div><div class="outfit-stamp-row"><div class="pack-note"><div class="pack-title">PACK YOUR OUTFITS</div><div>Party Wear<br>Yellow for Haldi<br>Pool / Foam Party Wear</div></div><div class="admit midstamp"${isFoc?' style="border-color:#a58336;color:#a58336"':''}>ADMIT ONE<br>WEDDING HOUSE${isFoc?'<svg viewBox="0 0 16 16" width="10" height="10" style="display:block;margin:1px auto 0" aria-hidden="true"><path fill="currentColor" d="M8 0L10 6L16 8L10 10L8 16L6 10L0 8L6 6Z"/></svg>':''}</div></div><div class="foot"><div class="bottom-note">Keep this card close — the Wedding House knows you by this.</div></div></div></div><div class="actions"><button class="share" onclick="saveCardImage(this)">SAVE ADMIT CARD</button><button class="share" onclick="shareCard()">SHARE INVITATION</button><button class="print" onclick="savePDF(this)">SAVE AS PDF</button></div></div><script>async function saveCardImage(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='SAVING CARD...';try{await document.fonts.ready;const card=document.querySelector('.card');const canvas=await html2canvas(card,{scale:4,useCORS:true,backgroundColor:'#f8efd9',logging:false,width:card.offsetWidth,height:card.offsetHeight});const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const file=new File([blob],'ADMIT CARD ${code}.png',{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'O.K.P · ${code}'})}else{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}}catch(e){if(!e||e.name!=='AbortError')alert('Could not save the admit card. Please try again.')}finally{btn.disabled=false;btn.textContent=old}}async function savePDF(btn){const old=btn.textContent;btn.disabled=true;btn.textContent='CREATING PDF...';try{await document.fonts.ready;const card=document.querySelector('.card');const canvas=await html2canvas(card,{scale:4,useCORS:true,backgroundColor:'#f8efd9',logging:false,width:card.offsetWidth,height:card.offsetHeight});const img=canvas.toDataURL('image/png');const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[108,171],compress:true});pdf.addImage(img,'PNG',0,0,108,171,undefined,'FAST');pdf.save('ADMIT CARD ${code}.pdf')}catch(e){alert('Could not create PDF. Please try again.')}finally{btn.disabled=false;btn.textContent=old}}async function shareCard(){try{await document.fonts.ready;const card=document.querySelector('.card');const canvas=await html2canvas(card,{scale:3,useCORS:true,backgroundColor:'#f8efd9',logging:false});const img=canvas.toDataURL('image/jpeg',0.98);const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:[108,171],compress:true});pdf.addImage(img,'JPEG',0,0,108,171,undefined,'FAST');const file=new File([pdf.output('blob')],'${code}.pdf',{type:'application/pdf'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:'O.K.P · ${code}'})}else{const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),30000)}}catch(e){if(!e||e.name!=='AbortError')alert('Could not share the PDF. Please try again.')}}<\/script></body></html>`);w.document.close()}let adminProofGuestId=null,adminProofBusy=false;
function openAdminProofUpload(id){
 const guest=data.find(x=>x.id===id);if(!guest)return;
 adminProofGuestId=id;
 q('adminProofGuest').textContent=guest.Name+' · '+guest.registration_code;
 q('adminProofFile').value='';
 q('adminProofError').textContent=guest.payment_proof?'Uploading a new proof will replace the existing proof reference.':'';
 q('adminProofDialog').showModal();
}
q('adminProofCancel').onclick=()=>{if(!adminProofBusy)q('adminProofDialog').close()};
q('adminProofDialog').addEventListener('cancel',e=>{if(adminProofBusy)e.preventDefault()});
q('adminProofForm').onsubmit=async e=>{
 e.preventDefault();if(adminProofBusy)return;
 const guest=data.find(x=>x.id===adminProofGuestId),file=q('adminProofFile').files[0];
 if(!guest||!file)return;
 if(!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size>5*1024*1024){q('adminProofError').textContent='Choose JPG, PNG or PDF up to 5 MB.';return}
 adminProofBusy=true;q('adminProofSave').disabled=true;q('adminProofError').textContent='Uploading...';
 try{
  const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg';
  const path='admin/'+encodeURIComponent(guest.registration_code)+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.'+ext;
  const upload=await fetch(U+'/storage/v1/object/payment-proofs/'+path,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':file.type,'x-upsert':'false'},body:file});
  if(!upload.ok)throw Error('Storage upload failed: '+(await upload.text()));
  const saved=await fetch(U+'/rest/v1/registrations?id=eq.'+guest.id,{method:'PATCH',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({payment_proof:path})});
  if(!saved.ok)throw Error('Proof uploaded, but linking to guest failed: '+(await saved.text()));
  guest.payment_proof=path;q('adminProofDialog').close();render();
 }catch(error){q('adminProofError').textContent=error.message}
 finally{adminProofBusy=false;q('adminProofSave').disabled=false}
};
async function proof(encoded){let path=decodeURIComponent(encoded);let r=await fetch(U+'/storage/v1/object/sign/payment-proofs/'+path,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:120})});let j=await r.json();if(!r.ok){alert('Could not open proof.');return}let url=j.signedURL||j.signedUrl;if(url&&!url.startsWith('http'))url=U+'/storage/v1'+url;window.open(url,'_blank')}q('guestType').onchange=render;q('search').oninput=render;q('filter').onchange=render;q('refresh').onclick=load;q('logout').onclick=()=>{sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html')};load();

async function exportExcel(){
 const button=q('exportExcel');if(!payLaterReady||!focReady){alert('Refresh after completing Pay Later setup before exporting payment classifications.');return}if(!token||!data.length){alert('No registrations available to export.');return}
 button.disabled=true;button.textContent='PREPARING EXCEL...';
 try{
  if(!window.XLSX){
   await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  }
  const filter=q('filter').value,search=q('search').value.trim().toLowerCase();
  const guests=data.filter(x=>matchesTeam(x)&&matchesGuestType(x)&&(filter==='all'||x['Payment status']===filter)&&[x.registration_code,x.Name,x.Whatsapp,x.care_of,x.payment_reference].some(v=>String(v??'').toLowerCase().includes(search)));
  const safe=v=>{const s=String(v??'');return /^[=+@\\-]/.test(s)?String.fromCharCode(39)+s:s};
  const rows=guests.map(x=>({'OKP ID':safe(x.registration_code),'Guest Name':safe(x.Name),'WhatsApp':safe(x.Whatsapp),'Isteda Contact (C/O)':safe(x.care_of),'Family Preference':safe(x.Preferred_family),'Assigned Team':teamsReady?teamLabels[teams.get(x.registration_code)||'unassigned']:'Unavailable','New to Community':safe(x.new_to_our_Community),'Heard About Us':safe(x.how_u_heard_about_us),'Payment Reference':safe(x.payment_reference),'Payment Status':safe(x['Payment status']),'Guest Type':focCodes.has(x.registration_code)?'FOC':isPayLater(x)?'Pay Later':x['Payment status']==='approved'?'Paid':'Pending / Rejected','Payment Due Date':safe(payLater.get(x.registration_code)?.due_date),'Paid At':safe(payLater.get(x.registration_code)?.paid_at),'Payment Method':safe(paymentMethodsReady?(paymentMethods.get(x.registration_code)||'Not assigned'):'Unavailable')}));
  const sheet=XLSX.utils.json_to_sheet(rows,{header:['OKP ID','Guest Name','WhatsApp','Isteda Contact (C/O)','Family Preference','Assigned Team','New to Community','Heard About Us','Payment Reference','Payment Status','Guest Type','Payment Due Date','Paid At','Payment Method']});
  sheet['!cols']=[{wch:18},{wch:26},{wch:20},{wch:28},{wch:22},{wch:20},{wch:22},{wch:25},{wch:20}];
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Guests');
  XLSX.writeFile(book,'OKP_Guest_List_'+new Date().toISOString().slice(0,10)+'.xlsx');
 }catch(e){console.error(e);alert('Excel export failed. Please try again.')}
 finally{button.disabled=false;button.textContent='DOWNLOAD EXCEL'}
}
q('exportExcel').onclick=exportExcel;

async function loadFocFlags(){
 focReady=false;focCodes=new Set();q('saveFoc').disabled=true;
 try{
  const response=await fetch(U+'/rest/v1/okp_complimentary_guests?select=registration_code',{headers:{apikey:K,Authorization:'Bearer '+token}});
  if(!response.ok)throw new Error('FOC setup is unavailable');
  const flags=await response.json();focCodes=new Set(flags.map(x=>x.registration_code));focReady=true;q('saveFoc').disabled=false;
  q('focResult').textContent='';
 }catch(e){q('focResult').textContent='FOC registration is not ready. Run admin-foc-setup.sql in Supabase SQL Editor first. Existing registrations still work.'}
}
q('addFoc').onclick=()=>{q('focPanel').hidden=!q('focPanel').hidden;q('addFoc').setAttribute('aria-expanded',String(!q('focPanel').hidden));if(!q('focPanel').hidden)q('focForm').elements.name.focus()};
q('cancelFoc').onclick=()=>{q('focPanel').hidden=true;q('addFoc').setAttribute('aria-expanded','false')};
q('focForm').onsubmit=async event=>{
 event.preventDefault();if(!focReady||q('saveFoc').disabled)return;
 const form=event.currentTarget,fields=new FormData(form),button=q('saveFoc');
 let phone=String(fields.get('whatsapp')||'').trim().replace(/[\s()-]/g,'');
 if(/^05\d{8}$/.test(phone))phone='+971'+phone.slice(1);
 else if(/^9715\d{8}$/.test(phone))phone='+'+phone;
 if(!/^\+9715\d{8}$/.test(phone)){q('focResult').textContent='Enter a valid UAE WhatsApp number.';return}
 const name=String(fields.get('name')||'').trim();
 if(!name){q('focResult').textContent='Enter the guest name.';return}
 button.disabled=true;button.textContent='SAVING...';q('focResult').textContent='';
 try{
  const response=await fetch(U+'/rest/v1/rpc/admin_add_okp_foc_guest',{
   method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},
   body:JSON.stringify({p_name:name,p_whatsapp:phone,p_preferred_family:fields.get('family'),p_new_to_community:fields.get('new'),p_heard_about_us:fields.get('heard'),p_care_of:String(fields.get('care')||'').trim()})
  });
  const result=await response.json();
  if(!response.ok)throw new Error(result.message||'Could not save this guest.');
  if(typeof result!=='string'||!result)throw new Error('No registration code returned. Refresh the guest list before trying again.');
  form.reset();q('search').value='';q('filter').value='all';q('guestType').value='all';await load();
  q('focResult').textContent=name+' registered successfully.\nRegistration ID: '+result+'\nStatus: Approved';
 }catch(e){q('focResult').textContent=e.message+' Check the guest list before retrying.'}
 finally{button.disabled=!focReady;button.textContent='SAVE & APPROVE'}
};


async function loadPayLater(){
 payLaterReady=false;payLater=new Map();
 try{
  const r=await fetch(U+'/rest/v1/okp_pay_later?select=registration_code,due_date,paid_at',{headers:{apikey:K,Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('Pay Later unavailable');
  const entries=await r.json();payLater=new Map(entries.map(x=>[x.registration_code,x]));payLaterReady=true;
 }catch(e){console.warn('Pay Later setup not available');}
}
function dubaiToday(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Dubai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const value=t=>parts.find(p=>p.type===t).value;return value('year')+'-'+value('month')+'-'+value('day')}
function payLaterBadge(x){
 if(!payLaterReady||!isPayLater(x))return '';
 const due=payLater.get(x.registration_code).due_date;
 const overdue=x['Payment status']==='approved'&&due<dubaiToday();
 return '<div class="pay-later-pill'+(overdue?' overdue':'')+'">PAY LATER · '+(overdue?'OVERDUE · ':'')+'Due '+esc(due)+'</div>';
}
function payLaterActions(x){
 if(!payLaterReady||!focReady||focCodes.has(x.registration_code))return '';
 if(isPayLater(x))return '<button class="btn small" onclick="openPayLater('+x.id+')">EDIT DUE DATE</button>'+(x['Payment status']==='approved'?'<button class="btn small wa" onclick="markLaterPaid('+x.id+')">MARK PAID</button>':'');
 return '<button class="btn small" onclick="openPayLater('+x.id+')">PAY LATER</button>';
}
function openPayLater(id){
 if(payLaterBusy||!payLaterReady||!focReady)return;
 const x=data.find(v=>v.id===id);if(!x||focCodes.has(x.registration_code))return;
 payLaterGuestId=id;q('payLaterGuest').textContent=x.Name+' · '+x.registration_code;
 q('payLaterDate').value=payLater.get(x.registration_code)?.due_date||'';
 q('payLaterError').textContent='';q('payLaterDialog').showModal();
}
async function savePayLater(x,due,paid){
 const r=await fetch(U+'/rest/v1/rpc/admin_set_okp_pay_later',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_code:x.registration_code,p_due_date:due,p_mark_paid:paid})});
 if(!r.ok){let error;try{error=await r.json()}catch(e){}throw Error(error?.message||'Could not save. Complete admin-pay-later-setup.sql and refresh.')}
}
async function markLaterPaid(id){
 if(!paymentMethodsReady){alert('Run admin-payment-collection-setup.sql in Supabase, then refresh to select the payment method.');return}
 openPaymentMode(id);
}

q('payLaterCancel').onclick=()=>{if(!payLaterBusy)q('payLaterDialog').close()};
q('payLaterDialog').addEventListener('cancel',event=>{if(payLaterBusy)event.preventDefault()});
q('payLaterForm').onsubmit=async event=>{
 event.preventDefault();if(payLaterBusy)return;
 const x=data.find(v=>v.id===payLaterGuestId),due=q('payLaterDate').value;
 if(!x||!/^\d{4}-\d{2}-\d{2}$/.test(due))return;
 payLaterBusy=true;q('payLaterSave').disabled=true;q('payLaterError').textContent='Saving...';
 try{
  await savePayLater(x,due,false);q('payLaterDialog').close();await load();
 }catch(e){q('payLaterError').textContent=e.message}
 finally{payLaterBusy=false;q('payLaterSave').disabled=false}
};

async function loadPaymentMethods(){
 paymentMethodsReady=false;paymentMethods=new Map();
 try{
  const r=await fetch(U+'/rest/v1/okp_payment_methods?select=registration_code,method',{headers:{apikey:K,Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('Payment mode setup unavailable');
  paymentMethods=new Map((await r.json()).map(x=>[x.registration_code,x.method]));paymentMethodsReady=true;
 }catch(e){console.warn('Payment method setup not available')}
}
function paymentMethodControl(x){
 if(!paymentMethodsReady||!focReady||focCodes.has(x.registration_code))return '';
 const labels={cash:'Cash',bank:'Bank Transfer',ziina:'Ziina'};
 const label=isPayLater(x)?'RECORD PAYMENT':labels[paymentMethods.get(x.registration_code)]||'SET PAYMENT MODE';
 return '<div style="margin-top:6px"><button class="btn small" onclick="openPaymentMode('+x.id+')">'+label+'</button></div>';
}
function openPaymentMode(id){
 if(!paymentMethodsReady||paymentModeBusy||payLaterBusy)return;
 const x=data.find(v=>v.id===id);if(!x||!focReady||focCodes.has(x.registration_code))return;
 paymentModeGuestId=id;q('paymentModeGuest').textContent=x.Name+' · '+x.registration_code;
 q('paymentMode').value=isPayLater(x)?'':paymentMethods.get(x.registration_code)||'';
 q('paymentModeError').textContent='';q('paymentModeDialog').showModal();
}
q('paymentModeCancel').onclick=()=>{if(!paymentModeBusy)q('paymentModeDialog').close()};
q('paymentModeDialog').addEventListener('cancel',e=>{if(paymentModeBusy)e.preventDefault()});
q('paymentModeForm').onsubmit=async e=>{
 e.preventDefault();if(paymentModeBusy)return;
 const x=data.find(v=>v.id===paymentModeGuestId),method=q('paymentMode').value;
 if(!x||!['cash','bank','ziina'].includes(method))return;
 paymentModeBusy=true;q('paymentModeSave').disabled=true;q('paymentModeError').textContent='Saving...';
 try{
  const r=await fetch(U+'/rest/v1/rpc/admin_record_okp_payment',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_code:x.registration_code,p_method:method})});
  if(!r.ok){const error=await r.json();throw Error(error.message||'Could not save payment')}
  q('paymentModeDialog').close();await load();
 }catch(error){q('paymentModeError').textContent=error.message}
 finally{paymentModeBusy=false;q('paymentModeSave').disabled=false}
};

async function loadTeams(){
 teamsReady=false;teams=new Map();
 try{
  for(let offset=0;;offset+=500){
   const r=await fetch(U+'/rest/v1/okp_team_assignments?select=registration_code,team&order=registration_code&limit=500&offset='+offset,{headers:{apikey:K,Authorization:'Bearer '+token}});
   if(!r.ok)throw Error('Team setup unavailable');
   const page=await r.json();page.forEach(x=>teams.set(x.registration_code,x.team));if(page.length<500)break;
  }
  teamsReady=true;
 }catch(e){console.warn('Team assignments could not be loaded')}
 q('teamFilter').disabled=!teamsReady;
 q('teamNotice').textContent=teamsReady?'Assign one team per guest. RSVP preferences stay unchanged.':'Team assignment is not ready. Run admin-team-setup.sql in Supabase SQL Editor, then refresh.';
}
function matchesTeam(x){const f=q('teamFilter').value;return f==='all'||teamsReady&&(teams.get(x.registration_code)||'unassigned')===f}
function renderTeamCounts(){
 for(const team of Object.keys(teamLabels)){
  const count=teamsReady?data.filter(x=>(teams.get(x.registration_code)||'unassigned')===team).length:'—';
  q('teamCount-'+team).textContent=count;
 }
}
function teamControl(x){
 const value=teams.get(x.registration_code)||'unassigned';
 return '<select class="assigned-team" aria-label="Assigned team for '+esc(x.Name)+'" '+(!teamsReady?'disabled ':'')+'onchange="saveTeam('+x.id+',this)">'+Object.entries(teamLabels).map(([key,label])=>'<option value="'+key+'"'+(key===value?' selected':'')+'>'+label+'</option>').join('')+'</select>';
}
async function saveTeam(id,select){
 const x=data.find(v=>v.id===id);if(!x||!teamsReady)return;
 const value=select.value,previous=teams.get(x.registration_code)||'unassigned';
 if(!Object.hasOwn(teamLabels,value))return;
 select.disabled=true;q('teamNotice').textContent='Saving team for '+x.Name+'…';
 try{
  const r=await fetch(U+'/rest/v1/rpc/admin_set_okp_team',{method:'POST',headers:{apikey:K,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({p_code:x.registration_code,p_team:value})});
  if(!r.ok){let error;try{error=await r.json()}catch(e){}throw Error(error?.message||'Could not save team. Please refresh and try again.')}
  if(value==='unassigned')teams.delete(x.registration_code);else teams.set(x.registration_code,value);
  render();q('teamNotice').textContent='Saved: '+x.Name+' → '+teamLabels[value]+'.';
 }catch(e){select.value=previous;q('teamNotice').textContent='Team was not saved: '+e.message}
 finally{select.disabled=false}
}
q('teamFilter').onchange=render;
