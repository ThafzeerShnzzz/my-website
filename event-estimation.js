'use strict';const ROOT='https://fbdkfzstxufvmjnkzzif.supabase.co',KEY='sb_publishable_X1jt3-YBCSZ0Pmk0cMV4ng_TqN9LNYm',TOKEN=sessionStorage.getItem('okp_admin_token');const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const money=n=>new Intl.NumberFormat('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);if(!TOKEN)location.replace('admin-v2.html');function headers(){return{apikey:KEY,Authorization:'Bearer '+TOKEN,'Content-Type':'application/json'}}async function request(url,options={}){const r=await fetch(ROOT+url,{...options,headers:{...headers(),...(options.headers||{})}});if(r.status===401){sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html');throw Error('Session expired')}if(!r.ok)throw Error((await r.text()).slice(0,350));if(r.status===204||options.headers?.Prefer==='return=minimal')return null;return r.json()}async function allRows(table,select,order){let rows=[];for(let offset=0;;offset+=500){const batch=await request('/rest/v1/'+table+'?select='+encodeURIComponent(select)+'&order='+order+'&limit=500&offset='+offset);rows.push(...batch);if(batch.length<500)return rows}}document.getElementById('logout').onclick=()=>{sessionStorage.removeItem('okp_admin_token');location.replace('admin-v2.html')};
// Independent planning budget: stored in a separate Supabase table and excluded from all actual cash calculations.
let estimates=[],estimateEditing=null;
function renderEstimates(){document.getElementById('estimateRows').innerHTML=estimates.map(x=>'<tr><td>'+esc(x.purpose)+'</td><td class="number">'+money(Math.round(Number(x.amount)*100))+'</td><td><button class="btn secondary" data-est-edit="'+Number(x.id)+'">EDIT</button> <button class="btn secondary" data-est-delete="'+Number(x.id)+'">DELETE</button></td></tr>').join('')||'<tr><td colspan="3">No estimates yet.</td></tr>';document.getElementById('estimateTotal').textContent='AED '+money(estimates.reduce((a,x)=>a+Math.round(Number(x.amount)*100),0));renderForecast()}
async function loadEstimates(){forecastReady.estimates=false;renderForecast();try{estimates=await allRows('okp_expense_estimates','id,purpose,amount','id.asc');renderEstimates();forecastReady.estimates=true;document.getElementById('estimateStatus').textContent=''}catch(e){document.getElementById('estimateStatus').textContent='Estimate setup required: run the new estimate SQL in Supabase. '+e.message}renderForecast()}
function resetEstimate(){estimateEditing=null;document.getElementById('estimateForm').reset();document.getElementById('estimateSave').textContent='+ ADD ESTIMATE';document.getElementById('estimateCancel').hidden=true}
document.getElementById('estimateCancel').onclick=resetEstimate;
document.getElementById('estimateRows').addEventListener('click',async e=>{const edit=e.target.closest('[data-est-edit]'),del=e.target.closest('[data-est-delete]');if(edit){const x=estimates.find(y=>y.id===Number(edit.dataset.estEdit));if(!x)return;estimateEditing=x.id;const expensePanel=document.getElementById('estimateForm').closest('details');if(expensePanel)expensePanel.open=true;document.getElementById('estimatePurpose').value=x.purpose;document.getElementById('estimateAmount').value=x.amount;document.getElementById('estimateSave').textContent='SAVE ESTIMATE CHANGES';document.getElementById('estimateCancel').hidden=false;document.getElementById('estimateForm').scrollIntoView({behavior:'smooth'});return}if(del){const x=estimates.find(y=>y.id===Number(del.dataset.estDelete));if(!x||!confirm('Delete estimate for '+x.purpose+'?'))return;try{await request('/rest/v1/okp_expense_estimates?id=eq.'+x.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(estimateEditing===x.id)resetEstimate();await loadEstimates()}catch(err){document.getElementById('estimateStatus').textContent=err.message}}});
document.getElementById('estimateForm').addEventListener('submit',async e=>{e.preventDefault();const b=document.getElementById('estimateSave'),n=Number(document.getElementById('estimateAmount').value),purpose=document.getElementById('estimatePurpose').value.trim();if(!purpose||!Number.isFinite(n)||n<=0||Math.abs(n*100-Math.round(n*100))>1e-6)return;b.disabled=true;try{await request('/rest/v1/okp_expense_estimates'+(estimateEditing!==null?'?id=eq.'+estimateEditing:''),{method:estimateEditing!==null?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({purpose,amount:n.toFixed(2)})});resetEstimate();await loadEstimates();document.getElementById('estimateStatus').textContent='Estimate saved. Actual balances unchanged.'}catch(err){document.getElementById('estimateStatus').textContent='Could not save estimate: '+err.message}finally{b.disabled=false}});

const TICKET_CENTS=19900;
let incomeEntries=[],incomeEditing=null,forecastGuestCount=null,forecastReady={guests:false,estimates:false,income:false},scenarioActive=false,scenarioInitialized=false;
const $f=id=>document.getElementById(id),cents=x=>Math.round(Number(x)*100),sumCents=rows=>rows.reduce((n,x)=>n+cents(x.amount),0);
function renderForecast(){
 const ready=Object.values(forecastReady).every(Boolean);
 if(!ready){$f('forecastProfit').textContent='—';$f('forecastState').textContent='Waiting for complete forecast data';$f('forecastRingPercent').textContent='—';$f('forecastRingArc').setAttribute('stroke-dasharray','0 427.26');$f('forecastRingHeadline').textContent='Awaiting forecast';$f('forecastRingDescription').textContent='Projected income compared with estimated expenses.';return}
 const liveGuests=forecastGuestCount,liveSponsor=sumCents(incomeEntries.filter(x=>x.income_type==='sponsorship')),liveOther=sumCents(incomeEntries.filter(x=>x.income_type==='other')),liveExpenses=sumCents(estimates);
 if(!scenarioActive){syncScenarioInputs(liveGuests,liveSponsor,liveOther,liveExpenses)}
 const guests=scenarioActive?Number($f('scenarioGuestNumber').value):liveGuests,sponsor=scenarioActive?Math.round(Number($f('scenarioSponsor').value)*100):liveSponsor,other=scenarioActive?Math.round(Number($f('scenarioOther').value)*100):liveOther,expenses=scenarioActive?Math.round(Number($f('scenarioExpenses').value)*100):liveExpenses,ticket=guests*TICKET_CENTS,total=ticket+sponsor+other,profit=total-expenses;
 $f('forecastProfit').textContent=(profit<0?'−':'')+'AED '+money(Math.abs(profit));$f('forecastProfit').className=profit<0?'negative':'positive';
 $f('forecastState').textContent=(scenarioActive?'WHAT-IF SCENARIO · ':'')+(profit<0?'Projected shortfall':profit===0?'Break-even forecast':'Projected surplus');
 $f('forecastIncome').textContent='AED '+money(total);$f('forecastTickets').textContent='AED '+money(ticket);$f('forecastGuests').textContent='· '+guests+' paying guests × AED 199';
 $f('forecastSponsor').textContent='AED '+money(sponsor);$f('forecastOther').textContent='AED '+money(other);$f('forecastExpenses').textContent='AED '+money(expenses);
 $f('forecastBreakEven').textContent=Math.max(0,Math.ceil((expenses-sponsor-other)/TICKET_CENTS))+' paying guests';
 const coverage=expenses>0?total/expenses*100:(total>0?100:0),shown=Math.max(0,Math.min(100,coverage));$f('forecastRingPercent').textContent=coverage.toFixed(1)+'%';$f('forecastRingArc').setAttribute('stroke-dasharray',(427.26*shown/100).toFixed(2)+' 427.26');$f('forecastRingHeadline').textContent=profit<0?'AED '+money(-profit)+' remaining':profit>0?'AED '+money(profit)+' surplus':'Costs fully covered';$f('forecastRingDescription').textContent=expenses===0?'No estimated expenses entered yet.':coverage>=100?'Projected income covers all estimated expenses.':'Projected income covers '+coverage.toFixed(1)+'% of estimated expenses.';
}
async function loadForecastGuests(){
 forecastReady.guests=false;renderForecast();
 try{
  const [registrations,foc,later]=await Promise.all([
   allRows('registrations','id,registration_code,"Payment status"','id.desc'),
   allRows('okp_complimentary_guests','registration_code','registration_code.asc'),
   allRows('okp_pay_later','registration_code,paid_at','registration_code.asc')
  ]);
  const focCodes=new Set(foc.map(x=>x.registration_code));
  // Pay Later guests retain approved status; include them regardless of paid_at.
  forecastGuestCount=registrations.filter(x=>x['Payment status']==='approved'&&!focCodes.has(x.registration_code)).length;
  forecastReady.guests=true;$f('forecastStatus').textContent='';
 }catch(e){$f('forecastStatus').textContent='Could not load approved paying guests / FOC / Pay Later. Forecast is hidden until all registration data is available. '+e.message}
 renderForecast();
}
function renderIncome(){
 $f('incomeRows').innerHTML=incomeEntries.map(x=>'<tr><td>'+esc(x.income_type==='sponsorship'?'Sponsorship':'Other income')+'<br><small>'+esc(x.purpose)+'</small></td><td class="number">'+money(cents(x.amount))+'</td><td><button class="btn secondary" data-inc-edit="'+Number(x.id)+'">EDIT</button> <button class="btn secondary" data-inc-delete="'+Number(x.id)+'">DELETE</button></td></tr>').join('')||'<tr><td colspan="3">No additional income entries yet.</td></tr>';
}
async function loadIncome(){
 forecastReady.income=false;renderForecast();
 try{incomeEntries=await allRows('okp_estimated_income','id,income_type,purpose,amount','id.asc');renderIncome();forecastReady.income=true;$f('incomeStatus').textContent=''}
 catch(e){$f('incomeRows').innerHTML='<tr><td colspan="3">Income table setup required.</td></tr>';$f('incomeStatus').textContent='Run event-forecast-income-setup.sql in Supabase SQL Editor, then refresh. '+e.message}
 renderForecast();
}
function resetIncome(){incomeEditing=null;$f('incomeForm').reset();$f('incomeSave').textContent='+ ADD INCOME';$f('incomeCancel').hidden=true}
$f('incomeCancel').onclick=resetIncome;
$f('incomeRows').addEventListener('click',async e=>{
 const edit=e.target.closest('[data-inc-edit]'),del=e.target.closest('[data-inc-delete]');
 if(edit){const x=incomeEntries.find(y=>y.id===Number(edit.dataset.incEdit));if(!x)return;incomeEditing=x.id;$f('incomeType').value=x.income_type;$f('incomePurpose').value=x.purpose;$f('incomeAmount').value=x.amount;$f('incomeSave').textContent='SAVE INCOME CHANGES';$f('incomeCancel').hidden=false;$f('incomeForm').scrollIntoView({behavior:'smooth'});return}
 if(del){const x=incomeEntries.find(y=>y.id===Number(del.dataset.incDelete));if(!x||!confirm('Delete planned income from '+x.purpose+'?'))return;try{await request('/rest/v1/okp_estimated_income?id=eq.'+x.id,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(incomeEditing===x.id)resetIncome();await loadIncome()}catch(err){$f('incomeStatus').textContent=err.message}}
});
$f('incomeForm').addEventListener('submit',async e=>{
 e.preventDefault();const b=$f('incomeSave'),amount=Number($f('incomeAmount').value),purpose=$f('incomePurpose').value.trim(),income_type=$f('incomeType').value;
 if(!purpose||!['sponsorship','other'].includes(income_type)||!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>1e-6)return;
 b.disabled=true;try{await request('/rest/v1/okp_estimated_income'+(incomeEditing!==null?'?id=eq.'+incomeEditing:''),{method:incomeEditing!==null?'PATCH':'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({income_type,purpose,amount:amount.toFixed(2)})});resetIncome();await loadIncome();$f('incomeStatus').textContent='Planned income saved. Actual collections unchanged.'}catch(err){$f('incomeStatus').textContent='Could not save income: '+err.message}finally{b.disabled=false}
});

function syncScenarioInputs(guests,sponsor,other,expenses){
 $f('scenarioGuests').max=String(Math.max(150,guests+30));$f('scenarioMaxLabel').textContent=$f('scenarioGuests').max+' guests';
 $f('scenarioGuests').value=guests;$f('scenarioGuestNumber').value=guests;$f('scenarioGuestLabel').textContent=guests;
 $f('scenarioSponsor').value=(sponsor/100).toFixed(2);$f('scenarioOther').value=(other/100).toFixed(2);$f('scenarioExpenses').value=(expenses/100).toFixed(2);
 $f('scenarioMode').textContent='LIVE DATA';$f('scenarioMode').classList.remove('testing');scenarioInitialized=true;
}
function activateScenario(){
 if(!Object.values(forecastReady).every(Boolean))return;
 scenarioActive=true;$f('scenarioMode').textContent='WHAT-IF MODE';$f('scenarioMode').classList.add('testing');renderForecast();
}
$f('scenarioGuests').addEventListener('input',()=>{
 $f('scenarioGuestNumber').value=$f('scenarioGuests').value;$f('scenarioGuestLabel').textContent=$f('scenarioGuests').value;activateScenario();
});
$f('scenarioGuestNumber').addEventListener('input',()=>{
 const n=Math.max(0,Math.min(10000,Math.floor(Number($f('scenarioGuestNumber').value)||0)));$f('scenarioGuests').max=String(Math.max(150,n));$f('scenarioMaxLabel').textContent=$f('scenarioGuests').max+' guests';$f('scenarioGuests').value=n;$f('scenarioGuestLabel').textContent=n;activateScenario();
});
for(const id of ['scenarioSponsor','scenarioOther','scenarioExpenses'])$f(id).addEventListener('input',()=>{if(Number($f(id).value)<0)$f(id).value='0';activateScenario()});
$f('scenarioReset').onclick=()=>{scenarioActive=false;renderForecast()};

$f('forecastRefresh').onclick=()=>Promise.all([loadForecastGuests(),loadEstimates(),loadIncome()]);
Promise.all([loadForecastGuests(),loadEstimates(),loadIncome()]);
