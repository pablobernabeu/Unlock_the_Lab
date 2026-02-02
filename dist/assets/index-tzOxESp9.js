import{i as X,g as J,a as Z,r as h,s as v,o as A}from"./firebase-CqdP5AWb.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const ee={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-HSC51V3CLP"},F=X(ee),y=J(F);Z(F);let p=0,S=[],M=[],L=[],u=null,O={},te={},w=0,E="";const G=30*60*1e3,Y=5*60*1e3,B=50*60*1e3,ne=[15*60*1e3,5*60*1e3],oe=1*60*1e3;let R=null,r=G,$=null,T=null,P=[],k=[],H=new Set;const se={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},q=100;document.addEventListener("DOMContentLoaded",async()=>{const e=loadState();if(u||(u=ie()),E=localStorage.getItem("userName"),E||(E=ae(),localStorage.setItem("userName",E)),re(),await ge(),he(),pe(),fe(),displayUsername(),e&&Object.keys(O).length>0&&restoreSubmittedRatings(),ue(),me(),w>0){const n=document.getElementById("total-score-header");n&&(n.textContent=`Score: ${w}`,document.getElementById("score-banner").style.display="flex")}const t=e&&p>0?p:0;console.log("Showing page:",t,"hasState:",e,"currentPage:",p),N(t)});window.nextPage=ye;window.previousPage=be;window.enableSubmit=ve;window.submitRating=$e;window.showHelp=we;window.closeHelp=Q;window.showTab=Ee;function ie(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function ae(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}function re(){R=Date.now(),r=G,U();const e=setInterval(()=>{Date.now()-R>=B&&clearInterval(e),U()},6e4);W(),z(),$=setTimeout(()=>{clearInterval(e),_()},r)}function W(){P.forEach(e=>clearTimeout(e)),P=[],ne.forEach(e=>{const t=r-e;if(t>0&&!H.has(e)){const n=setTimeout(()=>{ce(e),H.add(e)},t);P.push(n)}})}function z(){T&&clearTimeout(T);const e=r-oe;e>0&&r<B&&(T=setTimeout(()=>{le()},e))}function ce(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function le(){if(!(r<B)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(r/6e4),n=Math.floor(B/6e4),o=Math.floor(Y/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&de()}function de(){$&&clearTimeout($);const e=r+Y;r=Math.min(e,B),W(),z(),$=setTimeout(()=>{_()},r),U();const t=Math.floor((r-(e-Y))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function U(){const e=Date.now()-R,t=r-e,n=Math.floor(t/6e4),o=document.getElementById("session-timer");o&&t>0?(o.textContent=`${n} min remaining`,t<=5*6e4?o.style.color="#f56565":t<=15*6e4?o.style.color="#fbbf24":o.style.color=""):o&&(o.textContent="Session ending...",o.style.color="#f56565")}function _(){if(k.forEach(n=>{typeof n=="function"&&n()}),k=[],u){const n=h(y,`active/${u}`);v(n,null)}$&&clearTimeout($),T&&clearTimeout(T),P.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        text-align: center;
        padding: 20px;
    `;const t=Math.floor((Date.now()-R)/6e4);e.innerHTML=`
        <div>
            <h2 style="margin-bottom: 20px;">⏰ Session Expired</h2>
            <p style="margin-bottom: 20px;">
                Your ${t}-minute session has ended to conserve resources.<br>
                Thank you for participating!
            </p>
            <button onclick="location.reload()" style="
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            ">Start New Session</button>
        </div>
    `,document.body.appendChild(e)}function ue(){const e=h(y,`active/${u}`);v(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{v(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{v(e,null)})}function me(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=h(y,"active"),n=A(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).length;e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});k.push(n)}async function ge(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);M=e,L=t,S=n,document.getElementById("total-papers").textContent=S.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function pe(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(!M||M.length===0){console.error("Glossary data not loaded");return}const n=M.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function fe(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(!L||L.length===0){console.error("Rubric data not loaded");return}const n=`
        <table class="rubric-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Low (1-2)</th>
                    <th>Medium (3-5)</th>
                    <th>High (6-7)</th>
                </tr>
            </thead>
            <tbody>
                ${L.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function he(){const e=document.getElementById("paper-pages");S.forEach((t,n)=>{const o=`
            <div class="page" id="page-paper-${n}">
                <div class="container">
                    <div class="paper-card">
                        <div class="paper-header">
                            <div class="paper-id">${t.id}</div>
                            <h1 class="paper-title">${t.headline}</h1>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📰 Access</h3>
                            <p>${t.access}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🔬 Study Overview</h3>
                            <p>${t.overview}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📊 Methods & Data</h3>
                            <p>${t.methods}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>📝 Conclusion</h3>
                            <p>${t.conclusion}</p>
                        </div>
                        
                        <div class="paper-section">
                            <h3>🏛️ Source</h3>
                            <p>${t.source}</p>
                        </div>
                    </div>
                    
                    <div class="rating-section" id="rating-section-${n}">
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">1️⃣ Your Scientific Assessment</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Review all six rubric criteria (Access, Headline, Theory, Methods, Conclusion, Source). Then assign your overall quality rating:</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(s=>`
                                <div class="rating-option">
                                    <input type="radio" id="rating-${n}-${s}" 
                                           name="rating-${n}" value="${s}"
                                           onchange="enableSubmit(${n})">
                                    <label for="rating-${n}-${s}">${s}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Poor Quality</span>
                            <span>Excellent Quality</span>
                        </div>
                        
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 30px 0 15px 0; border-left: 4px solid #ff9800;">
                            <h3 style="margin: 0 0 10px 0; color: #f57c00;">2️⃣ Predict the Crowd</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Now guess: What will the AVERAGE rating be from all workshop participants? Will others catch the same flaws you did?</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(s=>`
                                <div class="rating-option">
                                    <input type="radio" id="prediction-${n}-${s}" 
                                           name="prediction-${n}" value="${s}"
                                           onchange="enableSubmit(${n})">
                                    <label for="prediction-${n}-${s}">${s}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Low Average</span>
                            <span>High Average</span>
                        </div>
                        
                        <button class="submit-rating" id="submit-${n}" 
                                onclick="submitRating(${n}, '${t.id}')" disabled>
                            Submit Both Ratings
                        </button>
                    </div>
                    
                    <div class="results-box" id="results-${n}" style="display: none;">
                        <h3>✅ Rating Submitted!</h3>
                        <div class="score-earned">
                            <div class="score-value" id="score-${n}"></div>
                            <div class="score-message" id="score-msg-${n}"></div>
                        </div>
                        <div class="rating-comparison">
                            <div class="rating-display">
                                <div class="label">Your Rating</div>
                                <div class="value" id="your-rating-${n}">-</div>
                            </div>
                            <div class="rating-display">
                                <div class="label">Average Rating</div>
                                <div class="value" id="avg-rating-${n}">-</div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${n}">
                            Calculating...
                        </div>
                        <button class="btn-primary" onclick="nextPage()" style="margin-top: 1.5rem;">
                            ${n<S.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=o})}function N(e){document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;e===0?n=document.getElementById("page-welcome"):e===1?n=document.getElementById("page-guide"):e<=S.length+1?(n=document.getElementById(`page-paper-${e-2}`),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"):(n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),Te()),n&&(n.classList.add("active"),window.scrollTo(0,0)),p=e,saveState()}function ye(){const e=S.length+3;p<e-1&&N(p+1)}function be(){p>0&&N(p-1)}function ve(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function $e(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),i=parseInt(o.value);try{const c=document.getElementById(`submit-${e}`);c.disabled=!0,c.textContent="Submitting...";const m=h(y,`ratings/${t}/${u}`);await v(m,{rating:s,prediction:i,timestamp:Date.now()}),O[t]=s,te[t]=i,saveState(),document.getElementById(`rating-section-${e}`).style.display="none",Se(e,t,s,i)}catch(c){console.error("Error submitting rating:",c),alert("Error submitting rating. Please try again.");const m=document.getElementById(`submit-${e}`);m.disabled=!1,m.textContent="Submit Both Ratings"}}async function Se(e,t,n,o,s=!1){const i=document.getElementById(`results-${e}`);i.style.display="block",document.getElementById(`your-rating-${e}`).textContent=n;const c=h(y,`ratings/${t}`),m=A(c,l=>{const a=l.val();if(a){const b=Object.values(a).map(d=>d.rating),j=se[t]||4,V=b.reduce((d,f)=>d+f,0)+j*q,K=b.length+q,g=V/K,x=b.length;if(document.getElementById(`avg-rating-${e}`).textContent=g.toFixed(1),document.getElementById(`count-${e}`).textContent=`Based on ${x} participant${x!==1?"s":""}`,x>=2&&!document.getElementById(`score-${e}`).textContent&&!s){const d=Math.abs(o-g),f=Math.max(0,100-Math.round(d*12));w+=f;const D=document.getElementById(`score-${e}`);D.textContent=`+${f} pts`,D.style.fontSize="2rem",D.style.fontWeight="bold",D.style.color=f>=88?"#10b981":f>=76?"#3b82f6":f>=64?"#f59e0b":"#ef4444";const C=document.getElementById(`score-msg-${e}`);C.innerHTML=d===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${g.toFixed(1)}`:d<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — spot on!`:d<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — very close!`:d<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — well done!`:d<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${g.toFixed(1)} — science perception is tricky!`,C.style.fontSize="0.95rem",C.style.lineHeight="1.5";const I=document.getElementById("total-score-header");I&&(I.textContent=`Score: ${w}`,I.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>I.style.animation="",500)),saveState()}}});k.push(m)}function we(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function Q(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function Ee(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&Q()};function Te(){document.getElementById("final-score").textContent=w;const e=h(y,`leaderboard/${u}`);v(e,{score:w,timestamp:Date.now(),papersRated:Object.keys(O).length,userName:E});const t=h(y,"leaderboard");A(t,n=>{const o=n.val();if(o){const s=Object.entries(o).map(([l,a])=>({id:l,score:a.score,timestamp:a.timestamp,userName:a.userName||"Anonymous"}));s.sort((l,a)=>a.score-l.score);const i=s.findIndex(l=>l.id===u)+1;document.getElementById("score-rank").textContent=`You ranked #${i} out of ${s.length} participant${s.length!==1?"s":""}!`;const m=s.slice(0,5).map((l,a)=>{const b=l.id===u;return`
                    <div class="leaderboard-entry ${b?"current-user":""}">
                        <span class="rank">${(a===0?"🥇":a===1?"🥈":a===2?"🥉":"")||`#${a+1}`}</span>
                        <span class="username">${l.userName}</span>
                        <span class="score">${l.score} pts</span>
                        ${b?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=m||"<p>Be the first to complete!</p>"}})}
