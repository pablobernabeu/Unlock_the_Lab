import{i as ee,g as te,a as ne,r as b,s as E,o as N}from"./firebase-CqdP5AWb.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const c of i.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();const oe={apiKey:"AIzaSyCjLzq8QNQqhGOpTJy3tzwuQrovMm6Vdi4",authDomain:"unlock-the-lab-workshop.firebaseapp.com",databaseURL:"https://unlock-the-lab-workshop-default-rtdb.europe-west1.firebasedatabase.app",projectId:"unlock-the-lab-workshop",storageBucket:"unlock-the-lab-workshop.firebasestorage.app",messagingSenderId:"604889899913",appId:"1:604889899913:web:d46afe88111e8bcb7d3758",measurementId:"G-HSC51V3CLP"},G=ee(oe),v=te(G);ne(G);let m=0,g=[],M=[],x=[],d=null,$={},C={},h=0,w="";const W=30*60*1e3,O=5*60*1e3,I=50*60*1e3,se=[15*60*1e3,5*60*1e3],ie=1*60*1e3;let R=null,r=W,T=null,B=null,L=[],k=[],F=new Set;const ae={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},z=100;document.addEventListener("DOMContentLoaded",async()=>{const e=le();if(d||(d=re()),w=localStorage.getItem("userName"),w||(w=ce(),localStorage.setItem("userName",w)),me(),await be(),console.log("Content loaded. Papers:",g.length),Se(),console.log("Paper pages generated"),ve(),$e(),ue(),e&&Object.keys($).length>0&&de(),he(),ye(),h>0){const n=document.getElementById("total-score-header");n&&(n.textContent=`Score: ${h}`,document.getElementById("score-banner").style.display="flex")}const t=e&&m>0?m:0;console.log("Showing page:",t,"hasState:",e,"currentPage:",m),H(t)});window.nextPage=we;window.previousPage=Ee;window.enableSubmit=Te;window.submitRating=Be;window.showHelp=Ie;window.closeHelp=J;window.showTab=De;function re(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function ce(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)];return`${n} ${o}`}function j(){const e={currentPage:m,userRatings:$,userPredictions:C,totalScore:h,sessionId:d};localStorage.setItem("workshopState",JSON.stringify(e))}function le(){try{const e=localStorage.getItem("workshopState");if(e){const t=JSON.parse(e);return m=t.currentPage||0,$=t.userRatings||{},C=t.userPredictions||{},h=t.totalScore||0,d=t.sessionId||null,!0}}catch(e){console.error("Error loading state:",e)}return!1}function de(){Object.keys($).forEach(e=>{const t=g.findIndex(n=>n.id===e);if(t>=0){const n=document.getElementById(`rating-section-${t}`),o=document.getElementById(`results-${t}`);if(n&&(n.style.display="none"),o){o.style.display="block";const s=$[e],i=C[e];s&&i&&K(t,e,s,i,!0)}}})}function ue(){document.querySelectorAll(".page").forEach(t=>{if(t.querySelector(".username-footer"))return;const n=document.createElement("div");n.className="username-footer",n.style.cssText="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;",n.textContent=`Playing as: ${w}`,t.querySelector(".container").appendChild(n)})}function me(){R=Date.now(),r=W,A();const e=setInterval(()=>{Date.now()-R>=I&&clearInterval(e),A()},6e4);_(),Q(),T=setTimeout(()=>{clearInterval(e),V()},r)}function _(){L.forEach(e=>clearTimeout(e)),L=[],se.forEach(e=>{const t=r-e;if(t>0&&!F.has(e)){const n=setTimeout(()=>{ge(e),F.add(e)},t);L.push(n)}})}function Q(){B&&clearTimeout(B);const e=r-ie;e>0&&r<I&&(B=setTimeout(()=>{pe()},e))}function ge(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function pe(){if(!(r<I)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(r/6e4),n=Math.floor(I/6e4),o=Math.floor(O/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&fe()}function fe(){T&&clearTimeout(T);const e=r+O;r=Math.min(e,I),_(),Q(),T=setTimeout(()=>{V()},r),A();const t=Math.floor((r-(e-O))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function A(){const e=Date.now()-R,t=r-e,n=Math.floor(t/6e4),o=document.getElementById("session-timer");o&&t>0?(o.textContent=`${n} min remaining`,t<=5*6e4?o.style.color="#f56565":t<=15*6e4?o.style.color="#fbbf24":o.style.color=""):o&&(o.textContent="Session ending...",o.style.color="#f56565")}function V(){if(k.forEach(n=>{typeof n=="function"&&n()}),k=[],d){const n=b(v,`active/${d}`);E(n,null)}T&&clearTimeout(T),B&&clearTimeout(B),L.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
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
    `,document.body.appendChild(e)}function he(){const e=b(v,`active/${d}`);E(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{E(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{E(e,null)})}function ye(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=b(v,"active"),n=N(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).length;e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});k.push(n)}async function be(){try{const[e,t,n]=await Promise.all([fetch("glossary.json").then(o=>o.json()),fetch("rubric.json").then(o=>o.json()),fetch("papers.json").then(o=>o.json())]);M=e,x=t,g=n,document.getElementById("total-papers").textContent=g.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function ve(){const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(!M||M.length===0){console.error("Glossary data not loaded");return}const n=M.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function $e(){const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(!x||x.length===0){console.error("Rubric data not loaded");return}const n=`
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
                ${x.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=n),t&&(t.innerHTML=n)}function Se(){const e=document.getElementById("paper-pages");g.forEach((t,n)=>{const o=`
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
                            ${n<g.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=o})}function H(e){console.log("showPage called with pageIndex:",e,"papers.length:",g.length),document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let n;if(e===0)n=document.getElementById("page-welcome");else if(e===1)n=document.getElementById("page-guide");else if(e<=g.length+1){const o=e-2;console.log("Trying to show paper page:",o),n=document.getElementById(`page-paper-${o}`),console.log("Target page found:",!!n),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"}else n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),Pe();n?(n.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),m=e,j()}function we(){const e=g.length+3;m<e-1&&H(m+1)}function Ee(){m>0&&H(m-1)}function Te(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function Be(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}const s=parseInt(n.value),i=parseInt(o.value);try{const c=document.getElementById(`submit-${e}`);c.disabled=!0,c.textContent="Submitting...";const p=b(v,`ratings/${t}/${d}`);await E(p,{rating:s,prediction:i,timestamp:Date.now()}),$[t]=s,C[t]=i,j(),document.getElementById(`rating-section-${e}`).style.display="none",K(e,t,s,i)}catch(c){console.error("Error submitting rating:",c),alert("Error submitting rating. Please try again.");const p=document.getElementById(`submit-${e}`);p.disabled=!1,p.textContent="Submit Both Ratings"}}async function K(e,t,n,o,s=!1){const i=document.getElementById(`results-${e}`);i.style.display="block",document.getElementById(`your-rating-${e}`).textContent=n;const c=b(v,`ratings/${t}`),p=N(c,l=>{const a=l.val();if(a){const S=Object.values(a).map(u=>u.rating),q=ae[t]||4,X=S.reduce((u,y)=>u+y,0)+q*z,Z=S.length+z,f=X/Z,Y=S.length;if(document.getElementById(`avg-rating-${e}`).textContent=f.toFixed(1),document.getElementById(`count-${e}`).textContent=`Based on ${Y} participant${Y!==1?"s":""}`,Y>=2&&!document.getElementById(`score-${e}`).textContent&&!s){const u=Math.abs(o-f),y=Math.max(0,100-Math.round(u*12));h+=y;const D=document.getElementById(`score-${e}`);D.textContent=`+${y} pts`,D.style.fontSize="2rem",D.style.fontWeight="bold",D.style.color=y>=88?"#10b981":y>=76?"#3b82f6":y>=64?"#f59e0b":"#ef4444";const U=document.getElementById(`score-msg-${e}`);U.innerHTML=u===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${f.toFixed(1)}`:u<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — spot on!`:u<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — very close!`:u<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — well done!`:u<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${f.toFixed(1)} — science perception is tricky!`,U.style.fontSize="0.95rem",U.style.lineHeight="1.5";const P=document.getElementById("total-score-header");P&&(P.textContent=`Score: ${h}`,P.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>P.style.animation="",500)),j()}}});k.push(p)}function Ie(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function J(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function De(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&J()};function Pe(){document.getElementById("final-score").textContent=h;const e=b(v,`leaderboard/${d}`);E(e,{score:h,timestamp:Date.now(),papersRated:Object.keys($).length,userName:w});const t=b(v,"leaderboard");N(t,n=>{const o=n.val();if(o){const s=Object.entries(o).map(([l,a])=>({id:l,score:a.score,timestamp:a.timestamp,userName:a.userName||"Anonymous"}));s.sort((l,a)=>a.score-l.score);const i=s.findIndex(l=>l.id===d)+1;document.getElementById("score-rank").textContent=`You ranked #${i} out of ${s.length} participant${s.length!==1?"s":""}!`;const p=s.slice(0,5).map((l,a)=>{const S=l.id===d;return`
                    <div class="leaderboard-entry ${S?"current-user":""}">
                        <span class="rank">${(a===0?"🥇":a===1?"🥈":a===2?"🥉":"")||`#${a+1}`}</span>
                        <span class="username">${l.userName}</span>
                        <span class="score">${l.score} pts</span>
                        ${S?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=p||"<p>Be the first to complete!</p>"}})}
