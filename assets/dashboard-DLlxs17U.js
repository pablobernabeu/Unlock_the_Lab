import"./modulepreload-polyfill-B5Qt9EMX.js";import{initializeApp as J}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getDatabase as Z,onValue as $,ref as f,set as X,get as I,remove as A}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";import{getAuth as ee,onAuthStateChanged as te,signInWithEmailAndPassword as ne,signOut as oe}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";const se={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-VEVYY65K1M"},q=J(se),b=Z(q),M=ee(q);let F={};fetch("papers.json").then(e=>e.json()).then(e=>{e.forEach(t=>{F[t.id]=t})}).catch(e=>console.error("Error loading papers:",e));const h=["STUDY-1","STUDY-2","STUDY-3","STUDY-4","STUDY-5","STUDY-6","STUDY-7","STUDY-8","STUDY-9","STUDY-10","STUDY-11","STUDY-12","STUDY-13","STUDY-14","STUDY-15","STUDY-16","STUDY-17","STUDY-18","STUDY-19","STUDY-20","STUDY-21","STUDY-22","STUDY-23","STUDY-24","STUDY-25","STUDY-26","STUDY-27","STUDY-28","STUDY-29","STUDY-30","STUDY-31","STUDY-32","STUDY-33","STUDY-34","STUDY-35","STUDY-36","STUDY-37","STUDY-38","STUDY-39","STUDY-40","STUDY-41","STUDY-42","STUDY-43","STUDY-44","STUDY-45","STUDY-46","STUDY-47","STUDY-48"],v={"STUDY-1":"low","STUDY-2":"high","STUDY-3":"medium","STUDY-4":"low","STUDY-5":"medium","STUDY-6":"medium","STUDY-7":"low","STUDY-8":"high","STUDY-9":"medium","STUDY-10":"high","STUDY-11":"low","STUDY-12":"medium","STUDY-13":"medium","STUDY-14":"medium","STUDY-15":"medium","STUDY-16":"medium","STUDY-17":"medium","STUDY-18":"medium","STUDY-19":"high","STUDY-20":"low","STUDY-21":"medium","STUDY-22":"high","STUDY-23":"medium","STUDY-24":"high","STUDY-25":"medium","STUDY-26":"medium","STUDY-27":"medium","STUDY-28":"low","STUDY-29":"low","STUDY-30":"medium","STUDY-31":"high","STUDY-32":"low","STUDY-33":"high","STUDY-34":"low","STUDY-35":"medium","STUDY-36":"low","STUDY-37":"high","STUDY-38":"low","STUDY-39":"high","STUDY-40":"low","STUDY-41":"high","STUDY-42":"low","STUDY-43":"high","STUDY-44":"medium","STUDY-45":"medium","STUDY-46":"low","STUDY-47":"high","STUDY-48":"medium"},ae={"STUDY-1":1,"STUDY-4":1,"STUDY-29":1,"STUDY-32":1,"STUDY-34":1,"STUDY-40":1,"STUDY-46":1,"STUDY-7":2,"STUDY-11":2,"STUDY-20":2,"STUDY-28":2,"STUDY-36":2,"STUDY-38":2,"STUDY-42":2,"STUDY-9":3,"STUDY-12":3,"STUDY-15":3,"STUDY-17":3,"STUDY-23":3,"STUDY-25":3,"STUDY-44":3,"STUDY-6":4,"STUDY-14":4,"STUDY-18":4,"STUDY-26":4,"STUDY-27":4,"STUDY-30":4,"STUDY-35":4,"STUDY-48":4,"STUDY-3":5,"STUDY-5":5,"STUDY-13":5,"STUDY-16":5,"STUDY-21":5,"STUDY-45":5,"STUDY-2":6,"STUDY-10":6,"STUDY-22":6,"STUDY-31":6,"STUDY-33":6,"STUDY-37":6,"STUDY-41":6,"STUDY-8":7,"STUDY-19":7,"STUDY-24":7,"STUDY-39":7,"STUDY-43":7,"STUDY-47":7},re=100,ie=localStorage.getItem("sessionId");ie&&(document.getElementById("results-link-display").style.display="block",document.getElementById("results-manual-entry").style.display="none");window.goToMyResults=function(){const e=localStorage.getItem("sessionId");e&&(window.location.href=`../?session=${e}`)};window.loadFromLink=function(){const e=document.getElementById("sessionLinkInput").value.trim(),t=document.getElementById("link-error");if(!e){t.textContent="⚠️ Please enter a username.",t.style.display="block";return}let n=null;if(e.startsWith("session_")||e.includes("?session="))try{n=new URL(e).searchParams.get("session")}catch{if(e.includes("session=")){const s=e.match(/session=([^&\s]+)/);s&&(n=s[1])}else e.startsWith("session_")&&(n=e)}if(!n&&U){const o=e.toLowerCase(),s=Object.entries(U);for(const[r,a]of s)if(a.userName&&a.userName.toLowerCase()===o){n=r;break}if(!n){for(const[r,a]of s)if(a.userName&&a.userName.toLowerCase().includes(o)){n=r;break}}}n?(t.style.display="none",window.location.href=`../?session=${encodeURIComponent(n)}`):(t.textContent=`⚠️ Username "${e}" not found. Make sure you've completed the workshop and entered your username correctly.`,t.style.display="block")};var j;(j=document.getElementById("sessionLinkInput"))==null||j.addEventListener("keypress",function(e){e.key==="Enter"&&window.loadFromLink()});let T;const de=document.getElementById("ratingsChart").getContext("2d");T=new Chart(de,{type:"bar",data:{labels:h,datasets:[{label:"Average Rating",data:[],backgroundColor:function(e){const t=e.dataIndex,n=v[h[t]];return n==="high"?"rgba(16, 185, 129, 0.7)":n==="medium"?"rgba(245, 158, 11, 0.7)":"rgba(239, 68, 68, 0.7)"},borderColor:function(e){const t=e.dataIndex,n=v[h[t]];return n==="high"?"rgba(16, 185, 129, 1)":n==="medium"?"rgba(245, 158, 11, 1)":"rgba(239, 68, 68, 1)"},borderWidth:2,borderRadius:6,errorBars:{}}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(e,t,n)=>{if(t.length>0){const a=t[0].index,d=h[a];showStudyDetails(d);return}const o=Chart.helpers.getRelativePosition(e,n),s=n.scales.x,r=n.scales.y;if(o.y>r.bottom&&o.y<n.height){const a=s.getValueForPixel(o.x);a>=0&&a<h.length&&showStudyDetails(h[Math.round(a)])}},scales:{y:{beginAtZero:!0,max:7,title:{display:!0,text:"Rating (1-7 scale)",font:{size:14,weight:"bold"},color:"#374151"}},x:{ticks:{callback:function(e,t){return h[t]},font:{size:10,weight:"bold"},color:"#667eea"}}},plugins:{tooltip:{callbacks:{label:function(e){return`Rating: ${e.parsed.y.toFixed(2)} (click for details)`}}},legend:{display:!1}}},plugins:[{id:"errorBars",afterDatasetsDraw(e){const t=e.ctx,n=e.getDatasetMeta(0),o=e.data.datasets[0].errorBars;n.data.forEach((s,r)=>{if(!o[r])return;const{lower:a,upper:d}=o[r],i=s.x,l=e.scales.y.getPixelForValue(a),p=e.scales.y.getPixelForValue(d);t.save(),t.strokeStyle="rgba(0, 0, 0, 0.8)",t.lineWidth=2,t.beginPath(),t.moveTo(i,l),t.lineTo(i,p),t.stroke(),t.beginPath(),t.moveTo(i-5,l),t.lineTo(i+5,l),t.stroke(),t.beginPath(),t.moveTo(i-5,p),t.lineTo(i+5,p),t.stroke(),t.restore()})}}]});function le(e){if(!e||e.length===0)return{mean:0,stdDev:0,min:0,max:0,agreement:0,ci95Lower:0,ci95Upper:0};const t=e.length,n=e.reduce((g,u)=>g+u,0)/t,o=e.reduce((g,u)=>g+Math.pow(u-n,2),0)/t,s=Math.sqrt(o),r=Math.min(...e),a=Math.max(...e),d=s/Math.sqrt(t),i=1.96,l=Math.max(1,n-i*d),p=Math.min(7,n+i*d),c=n===0?0:Math.min(100,100*(1-s/n));return{mean:n.toFixed(2),stdDev:s.toFixed(2),min:r.toFixed(1),max:a.toFixed(1),agreement:c.toFixed(0),ci95Lower:l.toFixed(2),ci95Upper:p.toFixed(2)}}function Y(e,t,n,o=!0,s=!1){const r=(e-t)/(n-t),a=Math.max(0,Math.min(1,r));if(o)if(s){const d=Math.round(254-34*a),i=Math.round(226+26*a),l=Math.round(226+5*a);return`rgb(${d}, ${i}, ${l})`}else{const d=Math.round(239-223*a),i=Math.round(68+117*a),l=Math.round(68+61*a);return`rgb(${d}, ${i}, ${l})`}else if(s){const d=Math.round(220+34*a),i=Math.round(252-26*a),l=Math.round(231-5*a);return`rgb(${d}, ${i}, ${l})`}else{const d=Math.round(16+223*a),i=Math.round(185-117*a),l=Math.round(129-61*a);return`rgb(${d}, ${i}, ${l})`}}function L(e,t,n){const o={};let s=0,r=[];const a=new Set,d=c=>Object.entries(c||{}).reduce((g,[u,m])=>{let y=null;return typeof m=="number"?y=m:m&&typeof m=="object"&&(y=m.rating),Number.isFinite(y)&&y>=1&&y<=7&&g.push({userId:u,rating:y}),g},[]);h.forEach(c=>{const g=e[c]||{},u=d(g),m=u.map(y=>y.rating);u.forEach(y=>{a.add(y.userId)}),s+=m.length});const i=a.size>0;h.forEach(c=>{const g=e[c]||{},m=d(g).map(S=>S.rating);let y;if(i){const S=ae[c]||4;y=[...m,...Array(re).fill(S)]}else y=[];o[c]={...le(y),count:m.length,totalCount:y.length}}),pe(o),document.getElementById("uniqueParticipants").textContent=a.size,document.getElementById("totalRatings").textContent=s;const l=t?Object.keys(t).filter(c=>{const g=t[c].lastActive;return Date.now()-g<6e4}).length:0;document.getElementById("activeParticipants").textContent=l;const p=n?Object.keys(n).length:0;if(n){r=Object.values(n).map(u=>u.score||0);const c=r.length>0?r.reduce((u,m)=>u+m,0)/r.length:0,g=Math.round(c/2300*100);document.getElementById("avgScore").textContent=`${g}%`}if(ge(l,p,e),ue(n),i){const c={};h.forEach((u,m)=>{c[m]={lower:parseFloat(o[u].ci95Lower),upper:parseFloat(o[u].ci95Upper)}}),T.data.datasets[0].data=h.map(u=>o[u].mean),T.data.datasets[0].errorBars=c,T.update();const g=document.getElementById("statsTableBody");g.innerHTML=h.map(u=>{const m=o[u],y=v[u],S=y==="high"?"quality-high":y==="medium"?"quality-medium":"quality-low",V=Y(m.mean,1,7,!0,!0),Q=Y(m.stdDev,0,3,!1,!0),P=parseFloat(m.agreement),G=Y(P,0,100,!0,!0),K=Y(m.count,0,Math.max(...h.map(_=>o[_].count)),!0,!0);return`
                        <tr data-study="${u}" data-quality="${y}" data-responses="${m.count}" 
                            data-mean="${m.mean}" data-stddev="${m.stdDev}" data-min="${m.min}" 
                            data-max="${m.max}" data-agreement="${P}">
                            <td><strong><a href="#" onclick="showStudyDetails('${u}'); return false;" style="color: #667eea; text-decoration: none; cursor: pointer;">${u}</a></strong></td>
                            <td>
                                <span class="quality-indicator ${S}"></span>
                                ${y.charAt(0).toUpperCase()+y.slice(1)}
                            </td>
                            <td class="color-scale" style="background: ${K}; color: #1f2937; font-weight: 600;">${m.count}</td>
                            <td class="color-scale" style="background: ${V}; color: #1f2937; font-weight: 600;">${m.mean}</td>
                            <td class="color-scale" style="background: ${Q}; color: #1f2937; font-weight: 600;">${m.stdDev}</td>
                            <td>${m.min}</td>
                            <td>${m.max}</td>
                            <td class="color-scale" style="background: ${G}; color: #1f2937; font-weight: 600;">${m.agreement}%</td>
                        </tr>
                    `}).join("")}else{T.data.datasets[0].data=[],T.data.datasets[0].errorBars={},T.update();const c=document.getElementById("statsTableBody");c.innerHTML='<tr><td colspan="8" style="text-align: center; color: #999; padding: 3rem;">📊 No participant data yet. Complete the workshop to see ratings appear here.</td></tr>'}}let x={},w={},E={},R={};$(f(b,"ratings"),e=>{x=e.val()||{},L(x,w,E)});$(f(b,"active"),e=>{w=e.val()||{},L(x,w,E)});$(f(b,"leaderboard"),e=>{E=e.val()||{},L(x,w,E)});$(f(b,"rankings"),e=>{R=e.val()||{},ce(R)});const z=[{key:"title",label:"📰 Title"},{key:"access",label:"📚 Access"},{key:"source",label:"🏛️ Source"},{key:"theory",label:"🔬 Theory"},{key:"methods",label:"📊 Methods & Data"},{key:"conclusion",label:"📝 Conclusion"}];function ce(e){const t=document.getElementById("criterion-importance-container");if(!t)return;const n=Object.values(e||{});if(n.length===0){t.innerHTML='<p style="text-align: center; color: #999; padding: 2rem 0;">No data yet.</p>';return}const o={title:0,access:0,source:0,theory:0,methods:0,conclusion:0};n.forEach(a=>{z.forEach(d=>{o[d.key]+=a[d.key]||0})});const s=Object.values(o).reduce((a,d)=>a+d,0),r=n.length;t.innerHTML=`
                <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 1rem;">Based on ${r} participant${r!==1?"s":""}</p>
                ${z.map(a=>{const d=s>0?Math.round(o[a.key]/s*100):0,i=(o[a.key]/r).toFixed(1);return`
                        <div style="margin-bottom: 0.9rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <span style="font-weight: 600; font-size: 0.9rem;">${a.label}</span>
                                <span style="font-weight: 700; color: #d97706; font-size: 0.9rem;">${d}% <span style="font-weight: 400; color: #9ca3af; font-size: 0.8rem;">(avg ${i}/20)</span></span>
                            </div>
                            <div style="background: #e5e7eb; border-radius: 4px; height: 14px; overflow: hidden;">
                                <div style="width: ${d}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 4px;"></div>
                            </div>
                        </div>`}).join("")}
            `}let k,D=10,B=null;te(M,e=>{B=e,e&&(document.getElementById("adminEmail").textContent=`✅ Signed in as ${e.email}`)});window.openAdminPanel=function(){document.getElementById("adminOverlay").classList.add("active"),B?(document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block"):(document.getElementById("passwordSection").style.display="block",document.getElementById("adminActions").style.display="none",document.getElementById("adminEmail").value="",document.getElementById("adminPassword").value="",document.getElementById("adminEmail").focus(),me())};window.closeAdminPanel=function(e){(!e||e.target.id==="adminOverlay"||e.target.classList.contains("btn-cancel"))&&(document.getElementById("adminOverlay").classList.remove("active"),clearInterval(k),D=10)};function me(){D=10,O(),k=setInterval(()=>{D--,O(),D<=0&&(clearInterval(k),closeAdminPanel({target:{id:"adminOverlay"}}))},1e3)}function O(){const e=document.getElementById("adminTimer");e.textContent=`Time remaining: ${D}s`,D<=3?e.classList.add("warning"):e.classList.remove("warning")}window.handlePasswordKeyPress=function(e){e.key==="Enter"&&verifyPassword()};window.verifyPassword=function(){const e=document.getElementById("adminEmail").value.trim(),t=document.getElementById("adminPassword").value;if(!e||!t){alert("❌ Please enter both email and password");return}const n=document.getElementById("loginBtn");n.disabled=!0,n.textContent="Signing in...",ne(M,e,t).then(o=>{clearInterval(k),B=o.user,document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block",document.getElementById("adminTitle").textContent="✅ Admin Panel",n.disabled=!1,n.textContent="Sign In"}).catch(o=>{let s="Authentication failed";o.code==="auth/invalid-credential"||o.code==="auth/wrong-password"||o.code==="auth/user-not-found"?s="Invalid email or password":o.code==="auth/too-many-requests"&&(s="Too many failed attempts. Try again later"),alert("❌ "+s),document.getElementById("adminPassword").value="",n.disabled=!1,n.textContent="Sign In"})};window.adminSignOut=function(){oe(M).then(()=>{B=null,closeAdminPanel({target:{id:"adminOverlay"}})}).catch(e=>{alert("❌ Error signing out: "+e.message)})};window.endAllSessions=function(){const e=Object.keys(w).length;if(e===0){alert("ℹ️ No active sessions to end");return}if(confirm(`⚠️ This will end ${e} active session(s).

Are you sure you want to continue?`)){const t=document.getElementById("endSessionsBtn");t.disabled=!0,t.textContent="Ending sessions...",X(f(b,"active"),null).then(()=>{alert(`✅ Successfully ended ${e} session(s)`),t.disabled=!1,t.textContent="⏹️ End all active sessions",closeAdminPanel({target:{id:"adminOverlay"}})}).catch(n=>{alert("❌ Error ending sessions: "+n.message),t.disabled=!1,t.textContent="⏹️ End all active sessions"})}};window.deleteAllRatingsData=async function(){const e=f(b,"ratings"),t=f(b,"leaderboard"),n=f(b,"rankings");try{const[o,s,r]=await Promise.all([I(e),I(t),I(n)]),a=o.exists(),d=s.exists(),i=r.exists();if(!a&&!d&&!i){alert("ℹ️ No data to delete.");return}let l=0,p=0,c=0;if(a){const y=o.val();Object.values(y).forEach(S=>{l+=Object.keys(S).length})}d&&(p=Object.keys(s.val()).length),i&&(c=Object.keys(r.val()).length);const g=`⚠️ WARNING: You are about to permanently delete:
• ${l} rating(s)
• ${p} participant(s) from leaderboard
• ${c} criterion ranking(s)

This action CANNOT be undone!

Type "DELETE" to confirm:`;if(prompt(g)!=="DELETE"){alert("❌ Deletion cancelled.");return}const m=document.getElementById("deleteDataBtn");m.disabled=!0,m.textContent="Deleting data...",await Promise.all([a?A(e):Promise.resolve(),d?A(t):Promise.resolve(),i?A(n):Promise.resolve()]),alert("✅ All data has been permanently deleted."),window.location.reload()}catch(o){alert("❌ Error deleting data: "+o.message);const s=document.getElementById("deleteDataBtn");s&&(s.disabled=!1,s.textContent="🗑️ Delete all ratings data")}};let C={column:-1,ascending:!0};window.sortTable=function(e,t){const n=document.getElementById("statsTable"),o=n.querySelector("tbody"),s=Array.from(o.querySelectorAll("tr")),r=C.column===e?!C.ascending:!0;C={column:e,ascending:r},n.querySelectorAll("th").forEach((l,p)=>{l.classList.remove("sort-asc","sort-desc"),p===e&&l.classList.add(r?"sort-asc":"sort-desc")});const d=["study","quality","responses","mean","stddev","min","max","agreement"][e],i={low:1,medium:2,high:3};s.sort((l,p)=>{let c=l.dataset[d],g=p.dataset[d];return e===1?(c=i[c]||0,g=i[g]||0):t==="number"?(c=parseFloat(c),g=parseFloat(g)):(c=c.toLowerCase(),g=g.toLowerCase()),c<g?r?-1:1:c>g?r?1:-1:0}),s.forEach(l=>o.appendChild(l))};function ge(e,t,n){const o=Math.min(100,e/100*100);document.getElementById("connectionUsage").textContent=`${e}/100`,document.getElementById("connectionBar").style.width=`${o}%`;const s=document.getElementById("connectionBar"),r=document.getElementById("connectionUsage");o>=90?(s.style.background="#ef4444",r.style.color="#ef4444"):o>=70?(s.style.background="#f59e0b",r.style.color="#f59e0b"):(s.style.background="#10b981",r.style.color="#10b981");const i=(((n?Object.keys(n).reduce((c,g)=>c+Object.keys(n[g]||{}).length,0):0)*200+e*100+t*150)/(1024*1024)).toFixed(2),l=Math.min(100,i/1024*100);document.getElementById("storageUsage").textContent=`~${i} MB`,document.getElementById("storageBar").style.width=`${l}%`;const p=document.getElementById("storageBar");l>=90?p.style.background="#ef4444":l>=70?p.style.background="#f59e0b":p.style.background="#10b981",document.getElementById("sessionCount").textContent=t}let N="allTime",U={};function ue(e){U=e||{},W()}function ye(e){N=e;const t=document.getElementById("tab24h"),n=document.getElementById("tabAllTime");e==="24h"?(t.style.color="#059669",t.style.fontWeight="bold",t.style.borderBottom="3px solid #059669",n.style.color="#6b7280",n.style.fontWeight="normal",n.style.borderBottom="3px solid transparent"):(n.style.color="#059669",n.style.fontWeight="bold",n.style.borderBottom="3px solid #059669",t.style.color="#6b7280",t.style.fontWeight="normal",t.style.borderBottom="3px solid transparent"),W()}window.switchLeaderboardTab=ye;function W(){const e=document.getElementById("leaderboardGrid");if(!U||Object.keys(U).length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions yet</div>';return}let t=Object.entries(U).map(([n,o])=>({sessionId:n,userName:o.userName||"Anonymous",score:o.score||0,papersRated:o.papersRated||0,timestamp:o.timestamp||0}));if(N==="24h"){const n=Date.now()-864e5;t=t.filter(o=>o.timestamp>=n)}if(t=t.sort((n,o)=>o.score-n.score).slice(0,200),t.length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions in the past 24 hours</div>';return}e.innerHTML=t.map((n,o)=>{const s=o+1,r=Math.round(n.score/2300*100),a=s===1?" 🥇":s===2?" 🥈":s===3?" 🥉":"",d=`#${s}`;let i="#f9fafb",l="#e5e7eb";s===1?(i="#fef3c7",l="#fbbf24"):s===2?(i="#e0e7ff",l="#818cf8"):s===3&&(i="#fce7f3",l="#f472b6");const p=s<=3?"bold":"500",c=r>=80?"#10b981":r>=60?"#3b82f6":r>=40?"#f59e0b":"#ef4444";return`
                    <div style="
                        background: ${i};
                        border: 1px solid ${l};
                        border-radius: 6px;
                        padding: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 8px;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div style="font-size: 0.8rem; font-weight: bold; color: #6b7280; flex-shrink: 0;">${d}</div>
                        <div style="font-size: 0.85rem; color: #1f2937; font-weight: ${p}; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.userName}${a}</div>
                        <div style="font-size: 0.9rem; font-weight: bold; color: ${c}; flex-shrink: 0;">${r}%</div>
                    </div>
                `}).join("")}let H={};window.showStudyDetails=function(e){const t=document.getElementById("studyModal"),n=v[e],o=H[e],s=F[e];if(!o){alert("No data available for this study yet.");return}document.getElementById("studyTitle").textContent=e,document.getElementById("studyQuality").innerHTML=`
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${n==="high"?"#10b981":n==="medium"?"#f59e0b":"#ef4444"}; margin-right: 8px;"></span>
                <strong>Quality Level:</strong> ${n.charAt(0).toUpperCase()+n.slice(1)}
            `;let r="";s?r=`
                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                        <h3 style="margin-top: 0; color: #20B2AA;">Rating Statistics</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Participants:</td>
                                <td style="padding: 0.75rem;">${o.count}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Mean Rating:</td>
                                <td style="padding: 0.75rem;">${o.mean} / 7</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">95% CI:</td>
                                <td style="padding: 0.75rem;">[${o.ci95Lower}, ${o.ci95Upper}]</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Std Deviation:</td>
                                <td style="padding: 0.75rem;">${o.stdDev}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Range:</td>
                                <td style="padding: 0.75rem;">${o.min} - ${o.max}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem; font-weight: 600;">Agreement:</td>
                                <td style="padding: 0.75rem;">${o.agreement}%</td>
                            </tr>
                        </table>
                        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 1rem; margin-bottom: 0;">
                            <strong>What this means:</strong> ${parseInt(o.agreement)>70?"High agreement among participants - ratings are consistent.":parseInt(o.agreement)>40?"Moderate agreement - some variation in ratings.":"Low agreement - participants have quite different opinions about this study."}
                        </p>
                    </div>
                    
                    <hr style="margin: 2rem 0; border: none; border-top: 2px solid #e5e7eb;">
                    
                    <div style="margin-top: 1.5rem;">
                        <h3 style="margin-top: 0; color: #20B2AA;">Study Details</h3>
                        <div style="background: #ffffff; padding: 1rem; border-left: 4px solid #20B2AA; margin-bottom: 1rem;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #374151; font-size: 1rem;">${s.title}</h4>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #20B2AA; font-size: 0.9rem; margin-bottom: 0.5rem;">📚 Access</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.access}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #20B2AA; font-size: 0.9rem; margin-bottom: 0.5rem;">🔍 Overview</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.overview}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #20B2AA; font-size: 0.9rem; margin-bottom: 0.5rem;">🧪 Methods</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.methods}</p>
                        </div>
                        
                        <div style="margin-bottom: 1.25rem;">
                            <h4 style="color: #20B2AA; font-size: 0.9rem; margin-bottom: 0.5rem;">💡 Conclusion</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.conclusion}</p>
                        </div>
                        
                        <div style="margin-bottom: 0;">
                            <h4 style="color: #20B2AA; font-size: 0.9rem; margin-bottom: 0.5rem;">📰 Source</h4>
                            <p style="margin: 0; font-size: 0.85rem; line-height: 1.6;">${s.source}</p>
                        </div>
                    </div>
                `:r=`
                    <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                        <h3 style="margin-top: 0; color: #20B2AA;">Rating Statistics</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Participants:</td>
                                <td style="padding: 0.75rem;">${o.count}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Mean Rating:</td>
                                <td style="padding: 0.75rem;">${o.mean} / 7</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">95% CI:</td>
                                <td style="padding: 0.75rem;">[${o.ci95Lower}, ${o.ci95Upper}]</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Std Deviation:</td>
                                <td style="padding: 0.75rem;">${o.stdDev}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                                <td style="padding: 0.75rem; font-weight: 600;">Range:</td>
                                <td style="padding: 0.75rem;">${o.min} - ${o.max}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.75rem; font-weight: 600;">Agreement:</td>
                                <td style="padding: 0.75rem;">${o.agreement}%</td>
                            </tr>
                        </table>
                        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 1rem; margin-bottom: 0;">
                            <strong>What this means:</strong> ${parseInt(o.agreement)>70?"High agreement among participants - ratings are consistent.":parseInt(o.agreement)>40?"Moderate agreement - some variation in ratings.":"Low agreement - participants have quite different opinions about this study."}
                        </p>
                    </div>
                `,document.getElementById("studyStats").innerHTML=r,t.classList.add("active")};window.closeStudyModal=function(){document.getElementById("studyModal").classList.remove("active")};document.addEventListener("keydown",function(e){(e.key==="Escape"||e.key==="Esc")&&document.getElementById("studyModal").classList.contains("active")&&closeStudyModal()});function pe(e){H=e}
