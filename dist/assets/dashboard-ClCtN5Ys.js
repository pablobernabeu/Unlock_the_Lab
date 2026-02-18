import"./modulepreload-polyfill-B5Qt9EMX.js";import{initializeApp as G}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";import{getDatabase as K,onValue as $,ref as S,set as _,get as C,remove as M}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";import{getAuth as J,onAuthStateChanged as Z,signInWithEmailAndPassword as X,signOut as ee}from"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";const te={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-VEVYY65K1M"},R=G(te),T=K(R),k=J(R);let O={};fetch("papers.json").then(e=>e.json()).then(e=>{e.forEach(t=>{O[t.id]=t})}).catch(e=>console.error("Error loading papers:",e));const p=["STUDY-1","STUDY-2","STUDY-3","STUDY-4","STUDY-5","STUDY-6","STUDY-7","STUDY-8","STUDY-9","STUDY-10","STUDY-11","STUDY-12","STUDY-13","STUDY-14","STUDY-15","STUDY-16","STUDY-17","STUDY-18","STUDY-19","STUDY-20","STUDY-21","STUDY-22","STUDY-23","STUDY-24","STUDY-25","STUDY-26","STUDY-27","STUDY-28","STUDY-29","STUDY-30","STUDY-31","STUDY-32","STUDY-33","STUDY-34","STUDY-35","STUDY-36","STUDY-37","STUDY-38","STUDY-39","STUDY-40","STUDY-41","STUDY-42","STUDY-43","STUDY-44","STUDY-45","STUDY-46","STUDY-47","STUDY-48"],w={"STUDY-1":"low","STUDY-2":"high","STUDY-3":"medium","STUDY-4":"low","STUDY-5":"medium","STUDY-6":"medium","STUDY-7":"low","STUDY-8":"high","STUDY-9":"medium","STUDY-10":"high","STUDY-11":"low","STUDY-12":"medium","STUDY-13":"medium","STUDY-14":"medium","STUDY-15":"medium","STUDY-16":"medium","STUDY-17":"medium","STUDY-18":"medium","STUDY-19":"high","STUDY-20":"low","STUDY-21":"medium","STUDY-22":"high","STUDY-23":"medium","STUDY-24":"high","STUDY-25":"medium","STUDY-26":"medium","STUDY-27":"medium","STUDY-28":"low","STUDY-29":"low","STUDY-30":"medium","STUDY-31":"high","STUDY-32":"low","STUDY-33":"high","STUDY-34":"low","STUDY-35":"medium","STUDY-36":"low","STUDY-37":"high","STUDY-38":"low","STUDY-39":"high","STUDY-40":"low","STUDY-41":"high","STUDY-42":"low","STUDY-43":"high","STUDY-44":"medium","STUDY-45":"medium","STUDY-46":"low","STUDY-47":"high","STUDY-48":"medium"},ne={"STUDY-1":1,"STUDY-4":1,"STUDY-29":1,"STUDY-32":1,"STUDY-34":1,"STUDY-40":1,"STUDY-46":1,"STUDY-7":2,"STUDY-11":2,"STUDY-20":2,"STUDY-28":2,"STUDY-36":2,"STUDY-38":2,"STUDY-42":2,"STUDY-9":3,"STUDY-12":3,"STUDY-15":3,"STUDY-17":3,"STUDY-23":3,"STUDY-25":3,"STUDY-44":3,"STUDY-6":4,"STUDY-14":4,"STUDY-18":4,"STUDY-26":4,"STUDY-27":4,"STUDY-30":4,"STUDY-35":4,"STUDY-48":4,"STUDY-3":5,"STUDY-5":5,"STUDY-13":5,"STUDY-16":5,"STUDY-21":5,"STUDY-45":5,"STUDY-2":6,"STUDY-10":6,"STUDY-22":6,"STUDY-31":6,"STUDY-33":6,"STUDY-37":6,"STUDY-41":6,"STUDY-8":7,"STUDY-19":7,"STUDY-24":7,"STUDY-39":7,"STUDY-43":7,"STUDY-47":7},oe=100,se=localStorage.getItem("sessionId");se&&(document.getElementById("results-link-display").style.display="block",document.getElementById("results-manual-entry").style.display="none");window.goToMyResults=function(){const e=localStorage.getItem("sessionId");e&&(window.location.href=`../?session=${e}`)};window.loadFromLink=function(){const e=document.getElementById("sessionLinkInput").value.trim(),t=document.getElementById("link-error");if(!e){t.textContent="⚠️ Please enter a username.",t.style.display="block";return}let n=null;if(e.startsWith("session_")||e.includes("?session="))try{n=new URL(e).searchParams.get("session")}catch{if(e.includes("session=")){const s=e.match(/session=([^&\s]+)/);s&&(n=s[1])}else e.startsWith("session_")&&(n=e)}if(!n&&b){const o=e.toLowerCase(),s=Object.entries(b);for(const[a,r]of s)if(r.userName&&r.userName.toLowerCase()===o){n=a;break}if(!n){for(const[a,r]of s)if(r.userName&&r.userName.toLowerCase().includes(o)){n=a;break}}}n?(t.style.display="none",window.location.href=`../?session=${encodeURIComponent(n)}`):(t.textContent=`⚠️ Username "${e}" not found. Make sure you've completed the workshop and entered your username correctly.`,t.style.display="block")};var P;(P=document.getElementById("sessionLinkInput"))==null||P.addEventListener("keypress",function(e){e.key==="Enter"&&window.loadFromLink()});let h;const ae=document.getElementById("ratingsChart").getContext("2d");h=new Chart(ae,{type:"bar",data:{labels:p,datasets:[{label:"Average Rating",data:[],backgroundColor:function(e){const t=e.dataIndex,n=w[p[t]];return n==="high"?"rgba(16, 185, 129, 0.7)":n==="medium"?"rgba(245, 158, 11, 0.7)":"rgba(239, 68, 68, 0.7)"},borderColor:function(e){const t=e.dataIndex,n=w[p[t]];return n==="high"?"rgba(16, 185, 129, 1)":n==="medium"?"rgba(245, 158, 11, 1)":"rgba(239, 68, 68, 1)"},borderWidth:2,borderRadius:6,errorBars:{}}]},options:{responsive:!0,maintainAspectRatio:!1,onClick:(e,t,n)=>{if(t.length>0){const r=t[0].index,u=p[r];showStudyDetails(u);return}const o=Chart.helpers.getRelativePosition(e,n),s=n.scales.x,a=n.scales.y;if(o.y>a.bottom&&o.y<n.height){const r=s.getValueForPixel(o.x);r>=0&&r<p.length&&showStudyDetails(p[Math.round(r)])}},scales:{y:{beginAtZero:!0,max:7,title:{display:!0,text:"Rating (1-7 scale)",font:{size:14,weight:"bold"},color:"#374151"}},x:{ticks:{callback:function(e,t){return p[t]},font:{size:10,weight:"bold"},color:"#667eea"}}},plugins:{tooltip:{callbacks:{label:function(e){return`Rating: ${e.parsed.y.toFixed(2)} (click for details)`}}},legend:{display:!1}}},plugins:[{id:"errorBars",afterDatasetsDraw(e){const t=e.ctx,n=e.getDatasetMeta(0),o=e.data.datasets[0].errorBars;n.data.forEach((s,a)=>{if(!o[a])return;const{lower:r,upper:u}=o[a],l=s.x,m=e.scales.y.getPixelForValue(r),c=e.scales.y.getPixelForValue(u);t.save(),t.strokeStyle="rgba(0, 0, 0, 0.8)",t.lineWidth=2,t.beginPath(),t.moveTo(l,m),t.lineTo(l,c),t.stroke(),t.beginPath(),t.moveTo(l-5,m),t.lineTo(l+5,m),t.stroke(),t.beginPath(),t.moveTo(l-5,c),t.lineTo(l+5,c),t.stroke(),t.restore()})}}]});function re(e){if(!e||e.length===0)return{mean:0,stdDev:0,min:0,max:0,agreement:0,ci95Lower:0,ci95Upper:0};const t=e.length,n=e.reduce((d,i)=>d+i,0)/t,o=e.reduce((d,i)=>d+Math.pow(i-n,2),0)/t,s=Math.sqrt(o),a=Math.min(...e),r=Math.max(...e),u=s/Math.sqrt(t),l=1.96,m=Math.max(1,n-l*u),c=Math.min(7,n+l*u),g=n===0?0:Math.min(100,100*(1-s/n));return{mean:n.toFixed(2),stdDev:s.toFixed(2),min:a.toFixed(1),max:r.toFixed(1),agreement:g.toFixed(0),ci95Lower:m.toFixed(2),ci95Upper:c.toFixed(2)}}function U(e,t,n,o=!0,s=!1){const a=(e-t)/(n-t),r=Math.max(0,Math.min(1,a));if(o)if(s){const u=Math.round(254-34*r),l=Math.round(226+26*r),m=Math.round(226+5*r);return`rgb(${u}, ${l}, ${m})`}else{const u=Math.round(239-223*r),l=Math.round(68+117*r),m=Math.round(68+61*r);return`rgb(${u}, ${l}, ${m})`}else if(s){const u=Math.round(220+34*r),l=Math.round(252-26*r),m=Math.round(231-5*r);return`rgb(${u}, ${l}, ${m})`}else{const u=Math.round(16+223*r),l=Math.round(185-117*r),m=Math.round(129-61*r);return`rgb(${u}, ${l}, ${m})`}}function I(e,t,n){const o={};let s=0,a=[];const r=new Set;p.forEach(c=>{const g=e[c]||{},d=Object.values(g).filter(i=>i!=null).map(i=>i.rating||i);Object.keys(g).forEach(i=>{g[i]!==null&&g[i]!==void 0&&r.add(i)}),s+=d.length});const u=r.size>0;p.forEach(c=>{const g=e[c]||{},d=Object.values(g).filter(y=>y!=null).map(y=>y.rating||y);let i;if(u){const y=ne[c]||4;i=[...d,...Array(oe).fill(y)]}else i=[];o[c]={...re(i),count:d.length,totalCount:i.length}}),me(o),document.getElementById("uniqueParticipants").textContent=r.size,document.getElementById("totalRatings").textContent=s;const l=t?Object.keys(t).filter(c=>{const g=t[c].lastActive;return Date.now()-g<6e4}).length:0;document.getElementById("activeParticipants").textContent=l;const m=n?Object.keys(n).length:0;if(n){a=Object.values(n).map(d=>d.score||0);const c=a.length>0?a.reduce((d,i)=>d+i,0)/a.length:0,g=Math.round(c/2300*100);document.getElementById("avgScore").textContent=`${g}%`}if(de(l,m,e),le(n),u){const c={};p.forEach((d,i)=>{c[i]={lower:parseFloat(o[d].ci95Lower),upper:parseFloat(o[d].ci95Upper)}}),h.data.datasets[0].data=p.map(d=>o[d].mean),h.data.datasets[0].errorBars=c,h.update();const g=document.getElementById("statsTableBody");g.innerHTML=p.map(d=>{const i=o[d],y=w[d],F=y==="high"?"quality-high":y==="medium"?"quality-medium":"quality-low",N=U(i.mean,1,7,!0,!0),W=U(i.stdDev,0,3,!1,!0),A=parseFloat(i.agreement),H=U(A,0,100,!0,!0),V=U(i.count,0,Math.max(...p.map(Q=>o[Q].count)),!0,!0);return`
                        <tr data-study="${d}" data-quality="${y}" data-responses="${i.count}" 
                            data-mean="${i.mean}" data-stddev="${i.stdDev}" data-min="${i.min}" 
                            data-max="${i.max}" data-agreement="${A}">
                            <td><strong><a href="#" onclick="showStudyDetails('${d}'); return false;" style="color: #667eea; text-decoration: none; cursor: pointer;">${d}</a></strong></td>
                            <td>
                                <span class="quality-indicator ${F}"></span>
                                ${y.charAt(0).toUpperCase()+y.slice(1)}
                            </td>
                            <td class="color-scale" style="background: ${V}; color: #1f2937; font-weight: 600;">${i.count}</td>
                            <td class="color-scale" style="background: ${N}; color: #1f2937; font-weight: 600;">${i.mean}</td>
                            <td class="color-scale" style="background: ${W}; color: #1f2937; font-weight: 600;">${i.stdDev}</td>
                            <td>${i.min}</td>
                            <td>${i.max}</td>
                            <td class="color-scale" style="background: ${H}; color: #1f2937; font-weight: 600;">${i.agreement}%</td>
                        </tr>
                    `}).join("")}else{h.data.datasets[0].data=[],h.data.datasets[0].errorBars={},h.update();const c=document.getElementById("statsTableBody");c.innerHTML='<tr><td colspan="8" style="text-align: center; color: #999; padding: 3rem;">📊 No participant data yet. Complete the workshop to see ratings appear here.</td></tr>'}}let Y={},D={},v={};$(S(T,"ratings"),e=>{Y=e.val()||{},I(Y,D,v)});$(S(T,"active"),e=>{D=e.val()||{},I(Y,D,v)});$(S(T,"leaderboard"),e=>{v=e.val()||{},I(Y,D,v)});let x,f=10,B=null;Z(k,e=>{B=e,e&&(document.getElementById("adminEmail").textContent=`✅ Signed in as ${e.email}`)});window.openAdminPanel=function(){document.getElementById("adminOverlay").classList.add("active"),B?(document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block"):(document.getElementById("passwordSection").style.display="block",document.getElementById("adminActions").style.display="none",document.getElementById("adminEmail").value="",document.getElementById("adminPassword").value="",document.getElementById("adminEmail").focus(),ie())};window.closeAdminPanel=function(e){(!e||e.target.id==="adminOverlay"||e.target.classList.contains("btn-cancel"))&&(document.getElementById("adminOverlay").classList.remove("active"),clearInterval(x),f=10)};function ie(){f=10,L(),x=setInterval(()=>{f--,L(),f<=0&&(clearInterval(x),closeAdminPanel({target:{id:"adminOverlay"}}))},1e3)}function L(){const e=document.getElementById("adminTimer");e.textContent=`Time remaining: ${f}s`,f<=3?e.classList.add("warning"):e.classList.remove("warning")}window.handlePasswordKeyPress=function(e){e.key==="Enter"&&verifyPassword()};window.verifyPassword=function(){const e=document.getElementById("adminEmail").value.trim(),t=document.getElementById("adminPassword").value;if(!e||!t){alert("❌ Please enter both email and password");return}const n=document.getElementById("loginBtn");n.disabled=!0,n.textContent="Signing in...",X(k,e,t).then(o=>{clearInterval(x),B=o.user,document.getElementById("passwordSection").style.display="none",document.getElementById("adminActions").style.display="block",document.getElementById("adminTitle").textContent="✅ Admin Panel",n.disabled=!1,n.textContent="Sign In"}).catch(o=>{let s="Authentication failed";o.code==="auth/invalid-credential"||o.code==="auth/wrong-password"||o.code==="auth/user-not-found"?s="Invalid email or password":o.code==="auth/too-many-requests"&&(s="Too many failed attempts. Try again later"),alert("❌ "+s),document.getElementById("adminPassword").value="",n.disabled=!1,n.textContent="Sign In"})};window.adminSignOut=function(){ee(k).then(()=>{B=null,closeAdminPanel({target:{id:"adminOverlay"}})}).catch(e=>{alert("❌ Error signing out: "+e.message)})};window.endAllSessions=function(){const e=Object.keys(D).length;if(e===0){alert("ℹ️ No active sessions to end");return}if(confirm(`⚠️ This will end ${e} active session(s).

Are you sure you want to continue?`)){const t=document.getElementById("endSessionsBtn");t.disabled=!0,t.textContent="Ending sessions...",_(S(T,"active"),null).then(()=>{alert(`✅ Successfully ended ${e} session(s)`),t.disabled=!1,t.textContent="⏹️ End all active sessions",closeAdminPanel({target:{id:"adminOverlay"}})}).catch(n=>{alert("❌ Error ending sessions: "+n.message),t.disabled=!1,t.textContent="⏹️ End all active sessions"})}};window.deleteAllRatingsData=async function(){const e=S(T,"ratings"),t=S(T,"leaderboard");try{const n=await C(e),o=await C(t),s=n.exists(),a=o.exists();if(!s&&!a){alert("ℹ️ No data to delete.");return}let r=0,u=0;if(s){const g=n.val();Object.values(g).forEach(d=>{r+=Object.keys(d).length})}a&&(u=Object.keys(o.val()).length);const l=`⚠️ WARNING: You are about to permanently delete:
• ${r} rating(s)
• ${u} participant(s) from leaderboard

This action CANNOT be undone!

Type "DELETE" to confirm:`;if(prompt(l)!=="DELETE"){alert("❌ Deletion cancelled.");return}const c=document.getElementById("deleteDataBtn");c.disabled=!0,c.textContent="Deleting data...",await Promise.all([s?M(e):Promise.resolve(),a?M(t):Promise.resolve()]),alert("✅ All ratings and leaderboard data has been permanently deleted."),window.location.reload()}catch(n){alert("❌ Error deleting data: "+n.message);const o=document.getElementById("deleteDataBtn");o&&(o.disabled=!1,o.textContent="🗑️ Delete all ratings data")}};let E={column:-1,ascending:!0};window.sortTable=function(e,t){const n=document.getElementById("statsTable"),o=n.querySelector("tbody"),s=Array.from(o.querySelectorAll("tr")),a=E.column===e?!E.ascending:!0;E={column:e,ascending:a},n.querySelectorAll("th").forEach((m,c)=>{m.classList.remove("sort-asc","sort-desc"),c===e&&m.classList.add(a?"sort-asc":"sort-desc")});const u=["study","quality","responses","mean","stddev","min","max","agreement"][e],l={low:1,medium:2,high:3};s.sort((m,c)=>{let g=m.dataset[u],d=c.dataset[u];return e===1?(g=l[g]||0,d=l[d]||0):t==="number"?(g=parseFloat(g),d=parseFloat(d)):(g=g.toLowerCase(),d=d.toLowerCase()),g<d?a?-1:1:g>d?a?1:-1:0}),s.forEach(m=>o.appendChild(m))};function de(e,t,n){const o=Math.min(100,e/100*100);document.getElementById("connectionUsage").textContent=`${e}/100`,document.getElementById("connectionBar").style.width=`${o}%`;const s=document.getElementById("connectionBar"),a=document.getElementById("connectionUsage");o>=90?(s.style.background="#ef4444",a.style.color="#ef4444"):o>=70?(s.style.background="#f59e0b",a.style.color="#f59e0b"):(s.style.background="#10b981",a.style.color="#10b981");const l=(((n?Object.keys(n).reduce((g,d)=>g+Object.keys(n[d]||{}).length,0):0)*200+e*100+t*150)/(1024*1024)).toFixed(2),m=Math.min(100,l/1024*100);document.getElementById("storageUsage").textContent=`~${l} MB`,document.getElementById("storageBar").style.width=`${m}%`;const c=document.getElementById("storageBar");m>=90?c.style.background="#ef4444":m>=70?c.style.background="#f59e0b":c.style.background="#10b981",document.getElementById("sessionCount").textContent=t}let z="allTime",b={};function le(e){b=e||{},q()}function ce(e){z=e;const t=document.getElementById("tab24h"),n=document.getElementById("tabAllTime");e==="24h"?(t.style.color="#059669",t.style.fontWeight="bold",t.style.borderBottom="3px solid #059669",n.style.color="#6b7280",n.style.fontWeight="normal",n.style.borderBottom="3px solid transparent"):(n.style.color="#059669",n.style.fontWeight="bold",n.style.borderBottom="3px solid #059669",t.style.color="#6b7280",t.style.fontWeight="normal",t.style.borderBottom="3px solid transparent"),q()}window.switchLeaderboardTab=ce;function q(){const e=document.getElementById("leaderboardGrid");if(!b||Object.keys(b).length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions yet</div>';return}let t=Object.entries(b).map(([n,o])=>({sessionId:n,userName:o.userName||"Anonymous",score:o.score||0,papersRated:o.papersRated||0,timestamp:o.timestamp||0}));if(z==="24h"){const n=Date.now()-864e5;t=t.filter(o=>o.timestamp>=n)}if(t=t.sort((n,o)=>o.score-n.score).slice(0,200),t.length===0){e.innerHTML='<div style="text-align: center; color: #999; grid-column: 1 / -1;">No completed sessions in the past 24 hours</div>';return}e.innerHTML=t.map((n,o)=>{const s=o+1,a=Math.round(n.score/2300*100),r=s===1?" 🥇":s===2?" 🥈":s===3?" 🥉":"",u=`#${s}`;let l="#f9fafb",m="#e5e7eb";s===1?(l="#fef3c7",m="#fbbf24"):s===2?(l="#e0e7ff",m="#818cf8"):s===3&&(l="#fce7f3",m="#f472b6");const c=s<=3?"bold":"500",g=a>=80?"#10b981":a>=60?"#3b82f6":a>=40?"#f59e0b":"#ef4444";return`
                    <div style="
                        background: ${l};
                        border: 1px solid ${m};
                        border-radius: 6px;
                        padding: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 8px;
                        transition: transform 0.2s, box-shadow 0.2s;
                    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
                        <div style="font-size: 0.8rem; font-weight: bold; color: #6b7280; flex-shrink: 0;">${u}</div>
                        <div style="font-size: 0.85rem; color: #1f2937; font-weight: ${c}; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${n.userName}${r}</div>
                        <div style="font-size: 0.9rem; font-weight: bold; color: ${g}; flex-shrink: 0;">${a}%</div>
                    </div>
                `}).join("")}let j={};window.showStudyDetails=function(e){const t=document.getElementById("studyModal"),n=w[e],o=j[e],s=O[e];if(!o){alert("No data available for this study yet.");return}document.getElementById("studyTitle").textContent=e,document.getElementById("studyQuality").innerHTML=`
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${n==="high"?"#10b981":n==="medium"?"#f59e0b":"#ef4444"}; margin-right: 8px;"></span>
                <strong>Quality Level:</strong> ${n.charAt(0).toUpperCase()+n.slice(1)}
            `;let a="";s?a=`
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
                `:a=`
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
                `,document.getElementById("studyStats").innerHTML=a,t.classList.add("active")};window.closeStudyModal=function(){document.getElementById("studyModal").classList.remove("active")};document.addEventListener("keydown",function(e){(e.key==="Escape"||e.key==="Esc")&&document.getElementById("studyModal").classList.contains("active")&&closeStudyModal()});function me(e){j=e}
