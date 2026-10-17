'use strict';
const COLLECTION_URL='https://fbdkfzstxufvmjnkzzif.supabase.co',COLLECTION_KEY='sb_publishable_X1jt3-YBCSZ0Pmk0cMV4ng_TqN9LNYm';
const el=id=>document.getElementById(id),collectionToken=sessionStorage.getItem('okp_admin_token');
const paymentRates={cash:19900,bank:19900,ziina:20550},paymentLabels={cash:'Cash',bank:'Bank Transfer',ziina:'Ziina',unassigned:'Method not assigned'};
let paidCollection=[];
const htmlEscape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatMoney=cents=>new Intl.NumberFormat('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(cents/100);
function summarizePayments(registrations,foc,later,methods){
 const focSet=new Set(foc.map(x=>x.registration_code)),unpaidSet=new Set(later.filter(x=>!x.paid_at).map(x=>x.registration_code)),methodMap=new Map(methods.map(x=>[x.registration_code,x.method]));
 const paid=registrations.filter(x=>x['Payment status']==='approved'&&!focSet.has(x.registration_code)&&!unpaidSet.has(x.registration_code)).map(x=>({...x,method:Object.hasOwn(paymentRates,methodMap.get(x.registration_code))?methodMap.get(x.registration_code):'unassigned'}));
 const counts={cash:0,bank:0,ziina:0,unassigned:0};
 paid.forEach(x=>counts[x.method]++);
 return {paid,counts,revenue:counts.cash*19900+counts.bank*19900+counts.ziina*20550};
}
async function collectionRows(table,select,order){
 let rows=[];
 for(let offset=0;;offset+=500){
  const response=await fetch(COLLECTION_URL+'/rest/v1/'+table+'?select='+encodeURIComponent(select)+'&order='+order+'&limit=500&offset='+offset,{headers:{apikey:COLLECTION_KEY,Authorization:'Bearer '+collectionToken}});
  if(response.status===401){sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html');throw Error('Please log in again.')}
  if(!response.ok)throw Error('Could not load payment data. Run admin-payment-collection-setup.sql in Supabase, then refresh. Admin access is required.');
  const batch=await response.json();rows=rows.concat(batch);if(batch.length<500)return rows;
 }
}
function renderPaymentSheet(){
 const search=el('search').value.trim().toLowerCase(),method=el('methodFilter').value;
 const list=paidCollection.filter(x=>(method==='all'||x.method===method)&&[x.Name,x.registration_code].some(v=>String(v??'').toLowerCase().includes(search)));
 el('guests').innerHTML=list.map(x=>'<tr><td>'+htmlEscape(x.registration_code)+'</td><td>'+htmlEscape(x.Name)+'</td><td>'+paymentLabels[x.method]+'</td><td class="number">'+(x.method==='unassigned'?'Not assigned':formatMoney(paymentRates[x.method]))+'</td></tr>').join('')||'<tr><td colspan="4">No paid guests match this filter.</td></tr>';
}
async function loadCollection(){
 if(!collectionToken){location.replace('admin-v2.html');return}
 el('refresh').disabled=true;el('collection').hidden=true;el('error').textContent='Loading payment collection…';
 try{
  const [registrations,foc,later,methods]=await Promise.all([collectionRows('registrations','id,Name,registration_code,"Payment status"','id.desc'),collectionRows('okp_complimentary_guests','registration_code','registration_code.asc'),collectionRows('okp_pay_later','registration_code,paid_at','registration_code.asc'),collectionRows('okp_payment_methods','registration_code,method','registration_code.asc')]);
  const result=summarizePayments(registrations,foc,later,methods);paidCollection=result.paid;
  el('revenue').textContent=formatMoney(result.revenue);el('paidGuests').textContent=paidCollection.length;el('totalGuests').textContent=paidCollection.length;el('totalAmount').textContent=formatMoney(result.revenue);
  el('summary').innerHTML=Object.entries(result.counts).map(([method,count])=>'<tr'+(method==='unassigned'?' class="unassigned"':'')+'><td>'+paymentLabels[method]+'</td><td class="number">'+count+'</td><td class="number">'+(method==='unassigned'?'Not assigned':formatMoney(count*paymentRates[method]))+'</td></tr>').join('');
  el('revenueNote').textContent=result.counts.unassigned?result.counts.unassigned+' paid guest(s) have no payment method. Total revenue includes assigned methods only; it will be complete after these guests are classified.':'All paid guests have a payment method. Total revenue uses Cash/Bank AED 199 and Ziina AED 205.50 per guest.';
  renderPaymentSheet();el('error').textContent='';el('collection').hidden=false;
 }catch(error){el('error').textContent=error.message}
 finally{el('refresh').disabled=false}
}
el('search').oninput=renderPaymentSheet;el('methodFilter').onchange=renderPaymentSheet;el('refresh').onclick=loadCollection;el('logout').onclick=()=>{sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html')};
loadCollection();
