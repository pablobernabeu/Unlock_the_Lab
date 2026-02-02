import"./modulepreload-polyfill-B5Qt9EMX.js";import{initializeApp as W}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getDatabase as H,onValue as I,ref as Y,set as N}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";import{getAuth as Q,onAuthStateChanged as G,signInWithEmailAndPassword as K,signOut as J}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";const Z={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-VEVYY65K1M"},P=W(Z),B=H(P),C=Q(P);let z={};fetch("papers.json").then(e=>e.json()).then(e=>{e.forEach(t=>{z[t.id]=t})}).catch(e=>console.error("Error loading papers:",e));const y=["STUDY-101","STUDY-102","STUDY-103","STUDY-104","STUDY-105","STUDY-106","STUDY-107","STUDY-108","STUDY-109","STUDY-110","STUDY-111","STUDY-112","STUDY-113","STUDY-114","STUDY-115","STUDY-116","STUDY-117","STUDY-118","STUDY-119","STUDY-120","STUDY-121","STUDY-122","STUDY-123"],x={"STUDY-101":"low","STUDY-102":"medium","STUDY-103":"high","STUDY-104":"low","STUDY-105":"medium","STUDY-106":"medium","STUDY-107":"low","STUDY-108":"high","STUDY-109":"medium","STUDY-110":"high","STUDY-111":"low","STUDY-112":"low","STUDY-113":"high","STUDY-114":"medium","STUDY-115":"low","STUDY-116":"medium","STUDY-117":"low","STUDY-118":"medium","STUDY-119":"high","STUDY-120":"low","STUDY-121":"medium","STUDY-122":"high","STUDY-123":"low"},X={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},_=100;let v;const ee=document.getElementById("ratingsChart").getContext("2d");v=new Chart(ee,{type:"bar",data:{labels:y,datasets:[{label:"Average Rating",data:[],backgroundColor:function(e){const t=e.dataIndex,o=x[y[t]];return o==="high"?"rgba(16, 185, 129, 0.7)":o==="medium"?"rgba(245, 158, 11, 0.7)":"rgba(239, 68, 68, 0.7)"},borderColor:function(e){const t=e.dataIndex,o=x[y[t]];return o==="high"?"rgba(16, 185, 129, 1)":o==="medium"?"rgba(245, 158, 11, 1)":"rgba(239, 68, 68, 1)"},borderWidth:2,borderRadius:6,errorBars:{}}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(e,t,o)=>{if(t.length>0){const l=t[0].index,m=y[l];showStudyDetails(m);return}const n=Chart.helpers.getRelativePosition(e,o),s=o.scales.x,i=o.scales.y;if(n.y>i.bottom&&n.y<o.height){const l=s.getValueForPixel(n.x);l>=0&&l<y.length&&showStudyDetails(y[Math.round(l)])}},scales:{y:{beginAtZero:!0,max:7,title:{display:!0,text:"Rating (1-7 scale)",font:{size:14,weight:"bold"},color:"#374151"}},x:{ticks:{callback:function(e,t){return y[t]},font:{size:10,weight:"bold"},color:"#667eea"}}},plugins:{tooltip:{callbacks:{label:function(e){return`Rating: ${e.parsed.y.toFixed(2)} (click for details)`}}},legend:{display:!1}}},plugins:[{id:"errorBars",afterDatasetsDraw(e){const t=e.ctx,o=e.getDatasetMeta(0),n=e.data.datasets[0].errorBars;o.data.forEach((s,i)=>{if(!n[i])return;const{lower:l,upper:m}=n[i],a=s.x,c=e.scales.y.getPixelForValue(l),g=e.scales.y.getPixelForValue(m);t.save(),t.strokeStyle="rgba(0, 0, 0, 0.8)",t.lineWidth=2,t.beginPath(),t.moveTo(a,c),t.lineTo(a,g),t.stroke(),t.beginPath(),t.moveTo(a-5,c),t.lineTo(a+5,c),t.stroke(),t.beginPath(),t.moveTo(a-5,g),t.lineTo(a+5,g),t.stroke(),t.restore()})}}]});function te(e){if(!e||e.length===0)return{mean:0,stdDev:0,min:0,max:0,agreement:0,ci95Lower:0,ci95Upper:0};const t=e.length,o=e.reduce((r,u)=>r+u,0)/t,n=e.reduce((r,u)=>r+Math.pow(u-o,2),0)/t,s=Math.sqrt(n),i=Math.min(...e),l=Math.max(...e),m=s/Math.sqrt(t),a=1.96,c=Math.max(1,o-a*m),g=Math.min(7,o+a*m),d=o===0?0:Math.min(100,100*(1-s/o));return{mean:o.toFixed(2),stdDev:s.toFixed(2),min:i.toFixed(1),max:l.toFixed(1),agreement:d.toFixed(0),ci95Lower:c.toFixed(2),ci95Upper:g.toFixed(2)}}function S(e,t,o,n=!0,s=!1){const i=(e-t)/(o-t),l=Math.max(0,Math.min(1,i));if(n)if(s){const m=Math.round(254-34*l),a=Math.round(226+26*l),c=Math.round(226+5*l);return`rgb(${m}, ${a}, ${c})`}else{const m=Math.round(239-223*l),a=Math.round(68+117*l),c=Math.round(68+61*l);return`rgb(${m}, ${a}, ${c})`}else if(s){const m=Math.round(220+34*l),a=Math.round(252-26*l),c=Math.round(231-5*l);return`rgb(${m}, ${a}, ${c})`}else{const m=Math.round(16+223*l),a=Math.round(185-117*l),c=Math.round(129-61*l);return`rgb(${m}, ${a}, ${c})`}}function M(e,t,o){const n={};let s=0,i=[];const l=new Set;y.forEach(d=>{const r=e[d]||{},u=Object.values(r).filter(p=>p!=null).map(p=>p.rating||p);Object.keys(r).forEach(p=>{r[p]!==null&&r[p]!==void 0&&l.add(p)});const f=X[d]||4,w=[...u,...Array(_).fill(f)];n[d]={...te(w),count:u.length,totalCount:w.length},s+=u.length}),re(n),document.getElementById("uniqueParticipants").textContent=l.size,document.getElementById("totalRatings").textContent=s;const m=t?Object.keys(t).filter(d=>{const r=t[d].timestamp;return Date.now()-r<6e4}).length:0;document.getElementById("activeParticipants").textContent=m;const a=o?Object.keys(o).length:0;if(document.getElementById("completedSessions").textContent=a,o){i=Object.values(o).map(u=>u.score||0);const d=i.length>0?i.reduce((u,f)=>u+f,0)/i.length:0,r=Math.round(d/2300*100);document.getElementById("avgScore").textContent=`${r}%`}oe(m,a,e),se(o);const c={};y.forEach((d,r)=>{c[r]={lower:parseFloat(n[d].ci95Lower),upper:parseFloat(n[d].ci95Upper)}}),v.data.datasets[0].data=y.map(d=>n[d].mean),v.data.datasets[0].errorBars=c,v.update();const g=document.getElementById("statsTableBody");g.innerHTML=y.map(d=>{const r=n[d],u=x[d],f=u==="high"?"quality-high":u==="medium"?"quality-medium":"quality-low",w=S(r.mean,1,7,!0,!0),p=S(r.stdDev,0,3,!1,!0),A=parseFloat(r.agreement),F=S(A,0,100,!0,!0),j=S(r.count,0,Math.max(...y.map(V=>n[V].count)),!0,!0);return`
                    <tr data-study="${d}" data-quality="${u}" data-responses="${r.count}" 
                        data-mean="${r.mean}" data-stddev="${r.stdDev}" data-min="${r.min}" 
                        data-max="${r.max}" data-agreement="${A}">
                        <td><strong><a href="#" onclick="showStudyDetails('${d}'); return false;" style="color: #667eea; text-decoration: none; cursor: pointer;">${d}</a></strong></td>
                        <td>
                            <span class="quality-indicator ${f}"></span>
                            ${u.charAt(0).toUpperCase()+u.slice(1)}
                        </td>
                        <td class="color-scale" style="background: ${j}; color: #1f2937; font-weight: 600;">${r.count}</td>
                        <td class="color-scale" style="background: ${w}; color: #1f2937; font-weight: 600;">${r.mean}</td>
                        <td class="color-scale" style="background: ${p}; color: #1f2937; font-weight: 600;">${r.stdDev}</td>
                        <td>${r.min}</td>
                        <td>${r.max}</td>
                        <td class="color-scale" style="background: ${F}; color: #1f2937; font-weight: 600;">${r.agreement}%</td>
                    </tr>
                `}).join("")}let D={},b={},U={};I(Y(B,"ratings"),e=>{D=e.val()||{},M(D,b,U)});I(Y(B,"active"),e=>{b=e.val()||{},M(D,b,U)});I(Y(B,"leaderboard"),e=>{U=e.val()||{},M(D,b,U)});let $,h=10,E=null;G(C,e=>{E=e,e&&(document.getElementById("adminEmail").textContent=`✅ Signed in as ${e.email}`)});window.openAdminPanel=function(){document.getElementById("adminOverlay").classList.add("active"),E?(document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block"):(document.getElementById("passwordSection").style.display="block",document.getElementById("adminActions").style.display="none",document.getElementById("adminEmail").value="",document.getElementById("adminPassword").value="",document.getElementById("adminEmail").focus(),ne())};window.closeAdminPanel=function(e){(!e||e.target.id==="adminOverlay"||e.target.classList.contains("btn-cancel"))&&(document.getElementById("adminOverlay").classList.remove("active"),clearInterval($),h=10)};function ne(){h=10,L(),$=setInterval(()=>{h--,L(),h<=0&&(clearInterval($),closeAdminPanel({target:{id:"adminOverlay"}}))},1e3)}function L(){const e=document.getElementById("adminTimer");e.textContent=`Time remaining: ${h}s`,h<=3?e.classList.add("warning"):e.classList.remove("warning")}window.handlePasswordKeyPress=function(e){e.key==="Enter"&&verifyPassword()};window.verifyPassword=function(){const e=document.getElementById("adminEmail").value.trim(),t=document.getElementById("adminPassword").value;if(!e||!t){alert("❌ Please enter both email and password");return}const o=document.getElementById("loginBtn");o.disabled=!0,o.textContent="Signing in...",K(C,e,t).then(n=>{clearInterval($),E=n.user,document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block",document.getElementById("adminTitle").textContent="✅ Admin Panel",o.disabled=!1,o.textContent="Sign In"}).catch(n=>{let s="Authentication failed";n.code==="auth/invalid-credential"||n.code==="auth/wrong-password"||n.code==="auth/user-not-found"?s="Invalid email or password":n.code==="auth/too-many-requests"&&(s="Too many failed attempts. Try again later"),alert("❌ "+s),document.getElementById("adminPassword").value="",o.disabled=!1,o.textContent="Sign In"})};window.adminSignOut=function(){J(C).then(()=>{E=null,closeAdminPanel({target:{id:"adminOverlay"}})}).catch(e=>{alert("❌ Error signing out: "+e.message)})};window.endAllSessions=function(){const e=Object.keys(b).length;if(e===0){alert("ℹ️ No active sessions to end");return}if(confirm(`⚠️ This will end ${e} active session(s).

Are you sure you want to continue?`)){const t=document.getElementById("endSessionsBtn");t.disabled=!0,t.textContent="Ending sessions...",N(Y(B,"active"),null).then(()=>{alert(`✅ Successfully ended ${e} session(s)`),t.disabled=!1,t.textContent="⏹️ End All Active Sessions",closeAdminPanel({target:{id:"adminOverlay"}})}).catch(o=>{alert("❌ Error ending sessions: "+o.message),t.disabled=!1,t.textContent="⏹️ End All Active Sessions"})}};let k={column:-1,ascending:!0};window.sortTable=function(e,t){const o=document.getElementById("statsTable"),n=o.querySelector("tbody"),s=Array.from(n.querySelectorAll("tr")),i=k.column===e?!k.ascending:!0;k={column:e,ascending:i},o.querySelectorAll("th").forEach((a,c)=>{a.classList.remove("sort-asc","sort-desc"),c===e&&a.classList.add(i?"sort-asc":"sort-desc")});const m=["study","quality","responses","mean","stddev","min","max","agreement"][e];s.sort((a,c)=>{let g=a.dataset[m],d=c.dataset[m];return t==="number"?(g=parseFloat(g),d=parseFloat(d)):(g=g.toLowerCase(),d=d.toLowerCase()),g<d?i?-1:1:g>d?i?1:-1:0}),s.forEach(a=>n.appendChild(a))};function oe(e,t,o){const n=Math.min(100,e/100*100);document.getElementById("connectionUsage").textContent=`${e}/100`,document.getElementById("connectionBar").style.width=`${n}%`;const s=document.getElementById("connectionBar"),i=document.getElementById("connectionUsage");n>=90?(s.style.background="#ef4444",i.style.color="#ef4444"):n>=70?(s.style.background="#f59e0b",i.style.color="#f59e0b"):(s.style.background="#10b981",i.style.color="#10b981");const a=(((o?Object.keys(o).reduce((d,r)=>d+Object.keys(o[r]||{}).length,0):0)*200+e*100+t*150)/(1024*1024)).toFixed(2),c=Math.min(100,a/1024*100);document.getElementById("storageUsage").textContent=`~${a} MB`,document.getElementById("storageBar").style.width=`${c}%`;const g=document.getElementById("storageBar");c>=90?g.style.background="#ef4444":c>=70?g.style.background="#f59e0b":g.style.background="#10b981",document.getElementById("sessionCount").textContent=t}let q="24h",T={};function se(e){T=e||{},O()}function ae(e){q=e;const t=document.getElementById("tab24h"),o=document.getElementById("tabAllTime");e==="24h"?(t.style.color="#667eea",t.style.fontWeight="bold",t.style.borderBottom="3px solid #667eea",o.style.color="#6b7280",o.style.fontWeight="normal",o.style.borderBottom="3px solid transparent"):(o.style.color="#667eea",o.style.fontWeight="bold",o.style.borderBottom="3px solid #667eea",t.style.color="#6b7280",t.style.fontWeight="normal",t.style.borderBottom="3px solid transparent"),O()}window.switchLeaderboardTab=ae;function O(){const e=document.getElementById("leaderboardGrid");if(!T||Object.keys(T).length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions yet</div>';return}let t=Object.entries(T).map(([o,n])=>({sessionId:o,userName:n.userName||"Anonymous",score:n.score||0,papersRated:n.papersRated||0,timestamp:n.timestamp||0}));if(q==="24h"){const o=Date.now()-864e5;t=t.filter(n=>n.timestamp>=o)}if(t=t.sort((o,n)=>n.score-o.score).slice(0,200),t.length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions in the past 24 hours</div>';return}e.innerHTML=t.map((o,n)=>{const s=n+1,i=Math.round(o.score/2300*100),l=s===1?" 🥇":s===2?" 🥈":s===3?" 🥉":"",m=`#${s}`;let a="#f9fafb",c="#e5e7eb";s===1?(a="#fef3c7",c="#fbbf24"):s===2?(a="#e0e7ff",c="#818cf8"):s===3&&(a="#fce7f3",c="#f472b6");const g=s<=3?"bold":"500",d=i>=80?"#10b981":i>=60?"#3b82f6":i>=40?"#f59e0b":"#ef4444";return`
                    <div style="
                        background: ${a};
                        border: 1px solid ${c};
                        border-radius: 6px;
                        padding: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 8px;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div style="font-size: 0.8rem; font-weight: bold; color: #6b7280; flex-shrink: 0;">${m}</div>
                        <div style="font-size: 0.85rem; color: #1f2937; font-weight: ${g}; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${o.userName}${l}</div>
                        <div style="font-size: 0.9rem; font-weight: bold; color: ${d}; flex-shrink: 0;">${i}%</div>
                    </div>
                `}).join("")}let R={};window.showStudyDetails=function(e){const t=document.getElementById("studyModal"),o=x[e],n=R[e],s=z[e];if(!n){alert("No data available for this study yet.");return}document.getElementById("studyTitle").textContent=e,document.getElementById("studyQuality").innerHTML=`
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${o==="high"?"#10b981":o==="medium"?"#f59e0b":"#ef4444"}; margin-right: 8px;"></span>
                <strong>Quality Level:</strong> ${o.charAt(0).toUpperCase()+o.slice(1)}
            `;let i="";s?i=`
                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                        <h3 style="margin-top: 0; color: #667eea;">Rating Statistics</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Participants:</td>
                                <td style="padding: 0.75rem;">${n.count}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Mean Rating:</td>
                                <td style="padding: 0.75rem;">${n.mean} / 7</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">95% CI:</td>
                                <td style="padding: 0.75rem;">[${n.ci95Lower}, ${n.ci95Upper}]</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Std Deviation:</td>
                                <td style="padding: 0.75rem;">${n.stdDev}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Range:</td>
                                <td style="padding: 0.75rem;">${n.min} - ${n.max}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem; font-weight: 600;">Agreement:</td>
                                <td style="padding: 0.75rem;">${n.agreement}%</td>
                            </tr>
                        </table>
                        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 1rem; margin-bottom: 0;">
                            <strong>What this means:</strong> ${parseInt(n.agreement)>70?"High agreement among participants - ratings are consistent.":parseInt(n.agreement)>40?"Moderate agreement - some variation in ratings.":"Low agreement - participants have quite different opinions about this study."}
                        </p>
                    </div>
                    
                    <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e5e7eb;">
                    
                    <div style="margin-top: 1.5rem;">
                        <h3 style="margin-top: 0; color: #667eea;">Study Details</h3>
                        <div style="background: #ffffff; padding: 1rem; border-left: 4px solid #667eea; margin-bottom: 1rem;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #374151; font-size: 1rem;">${s.headline}</h4>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem;">📚 Access</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.access}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem;">🔍 Overview</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.overview}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem;">🧪 Methods</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.methods}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem;">💡 Conclusion</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.conclusion}</p>
                        </div>
                        
                        <div style="margin-bottom: 0;">
                            <h4 style="color: #667eea; font-size: 0.9rem; margin-bottom: 0.5rem;">📰 Source</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.source}</p>
                        </div>
                    </div>
                `:i=`
                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                        <h3 style="margin-top: 0; color: #667eea;">Rating Statistics</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Participants:</td>
                                <td style="padding: 0.75rem;">${n.count}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Mean Rating:</td>
                                <td style="padding: 0.75rem;">${n.mean} / 7</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">95% CI:</td>
                                <td style="padding: 0.75rem;">[${n.ci95Lower}, ${n.ci95Upper}]</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Std Deviation:</td>
                                <td style="padding: 0.75rem;">${n.stdDev}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Range:</td>
                                <td style="padding: 0.75rem;">${n.min} - ${n.max}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem; font-weight: 600;">Agreement:</td>
                                <td style="padding: 0.75rem;">${n.agreement}%</td>
                            </tr>
                        </table>
                        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 1rem; margin-bottom: 0;">
                            <strong>What this means:</strong> ${parseInt(n.agreement)>70?"High agreement among participants - ratings are consistent.":parseInt(n.agreement)>40?"Moderate agreement - some variation in ratings.":"Low agreement - participants have quite different opinions about this study."}
                        </p>
                    </div>
                `,document.getElementById("studyStats").innerHTML=i,t.classList.add("active")};window.closeStudyModal=function(){document.getElementById("studyModal").classList.remove("active")};document.addEventListener("keydown",function(e){(e.key==="Escape"||e.key==="Esc")&&document.getElementById("studyModal").classList.contains("active")&&closeStudyModal()});function re(e){R=e}
