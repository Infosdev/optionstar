// ==================== LOGIN PAGE MODULE ====================

const DEFAULT_USERS_B64 = {'a2F0aGlydmVsMzAxQGdtYWlsLmNvbQ==':'VFJBREU3Nzc='};
function b64e(s){try{return btoa(s);}catch(e){return s;}}
function b64d(s){try{return atob(s);}catch(e){return s;}}
function getDefaultUsers(){const r={};Object.entries(DEFAULT_USERS_B64).forEach(([k,v])=>{r[b64d(k)]=b64d(v);});return r;}

function setActiveTab(t){
  ['loginTab','registerTab'].forEach(id=>document.getElementById(id).classList.toggle('active',id===t+'Tab'));
  ['loginForm','registerForm'].forEach(id=>document.getElementById(id).classList.toggle('active',id===t+'Form'));
  document.getElementById('loginError').textContent='';
  document.getElementById('registerError').textContent='';
  document.getElementById('registerSuccess').textContent='';
}

function togglePwd(id,btn){
  const el=document.getElementById(id);
  const a=btn.querySelector('.eye-icon'),b=btn.querySelector('.eye-icon-slash');
  el.type=el.type==='password'?'text':'password';
  a.classList.toggle('hidden');b.classList.toggle('hidden');
}

function getUsers(){
  const stored=JSON.parse(localStorage.getItem('os_users')||'{}');
  const decoded={};
  Object.entries(stored).forEach(([k,v])=>{try{decoded[k]=b64d(v);}catch(e){decoded[k]=v;}});
  return{...getDefaultUsers(),...decoded};
}

function handleLogin(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPassword').value;
  const errEl=document.getElementById('loginError');
  const btn=document.getElementById('loginBtn');
  const loader=document.getElementById('loginLoader');
  errEl.textContent='';
  if(!email||!pass){errEl.textContent='Please enter email and password.';return;}
  btn.disabled=true;loader.style.display='block';
  setTimeout(()=>{
    const users=getUsers();
    if(users[email]===pass){
      localStorage.setItem('os_auth_user',email);
      localStorage.setItem('os_auth_time',Date.now());
      window.location.href='app.html';
    }else{
      errEl.textContent='Invalid email or password. Please try again.';
      btn.disabled=false;loader.style.display='none';
    }
  },700);
}

function handleRegister(){
  const email=document.getElementById('registerEmail').value.trim();
  const pass=document.getElementById('registerPassword').value;
  const conf=document.getElementById('confirmPassword').value;
  const errEl=document.getElementById('registerError');
  const succEl=document.getElementById('registerSuccess');
  const btn=document.getElementById('registerBtn');
  const loader=document.getElementById('registerLoader');
  errEl.textContent='';succEl.textContent='';
  if(!email||!pass||!conf){errEl.textContent='Please fill in all fields.';return;}
  if(pass!==conf){errEl.textContent='Passwords do not match.';return;}
  if(pass.length<6){errEl.textContent='Password must be at least 6 characters.';return;}
  btn.disabled=true;loader.style.display='block';
  setTimeout(()=>{
    const users=getUsers();
    if(users[email]){errEl.textContent='Email already registered. Please login.';btn.disabled=false;loader.style.display='none';return;}
    const stored=JSON.parse(localStorage.getItem('os_users')||'{}');
    stored[email]=b64e(pass);localStorage.setItem('os_users',JSON.stringify(stored));
    succEl.textContent='Account created! Redirecting...';
    localStorage.setItem('os_auth_user',email);localStorage.setItem('os_auth_time',Date.now());
    setTimeout(()=>{window.location.href='app.html';},1200);
  },700);
}

document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(document.getElementById('loginForm').classList.contains('active'))handleLogin();
    else handleRegister();
  }
});

// Auto-redirect if already logged in
const u=localStorage.getItem('os_auth_user'),t=localStorage.getItem('os_auth_time');
if(u&&t&&(Date.now()-t)<86400000)window.location.href='app.html';

// Expose to HTML onclick handlers
window.setActiveTab = setActiveTab;
window.togglePwd = togglePwd;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
