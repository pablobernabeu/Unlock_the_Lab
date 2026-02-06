import"./modulepreload-polyfill-B5Qt9EMX.js";import{d as $}from"./firebase-config-mIbZvLPF.js";import{r as S,g as ce,s as T,o as G}from"./firebase-4YSElDcj.js";let f=0,u=[],k=[],U=[],c=null,w={},O={},b=0,v="",J=[],E=null,W=[],te=[];const ne=30*60*1e3,_=5*60*1e3,M=50*60*1e3,de=[15*60*1e3,5*60*1e3],ue=1*60*1e3;let Y=null,g=ne,B=null,D=null,C=[],N=[],Z=new Set;const me={"STUDY-101":1,"STUDY-102":5,"STUDY-103":6,"STUDY-104":1,"STUDY-105":5,"STUDY-106":4,"STUDY-107":2,"STUDY-108":7,"STUDY-109":4,"STUDY-110":6,"STUDY-111":2,"STUDY-112":1,"STUDY-113":6,"STUDY-114":5,"STUDY-115":3,"STUDY-116":5,"STUDY-117":1,"STUDY-118":4,"STUDY-119":7,"STUDY-120":2,"STUDY-121":5,"STUDY-122":6,"STUDY-123":1},ee=100;document.addEventListener("DOMContentLoaded",async()=>{const e=fe();if(c||(c=ge()),v=localStorage.getItem("userName"),v||(v=await pe(),localStorage.setItem("userName",v)),be(),await Te(),console.log("Content loaded. Papers:",u.length),De(),console.log("Paper pages generated"),Be(),Ie(),ye(),e&&Object.keys(w).length>0&&he(),we(),Ee(),b>0){const t=document.getElementById("total-score-header");if(t){const o=u.length||23,i=Math.round(b/(o*100)*100);t.innerHTML=`<span class="medal-icon">🏆</span> ${i}%`,document.getElementById("score-banner").style.display="flex"}}const n=e&&f>0?f:0;console.log("Showing page:",n,"hasState:",e,"currentPage:",f),V(n)});window.nextPage=Me;window.previousPage=xe;window.enableSubmit=Re;window.submitRating=Le;window.showHelp=Pe;window.closeHelp=K;window.showTab=ke;function ge(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function F(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],n=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],t=e[Math.floor(Math.random()*e.length)],o=n[Math.floor(Math.random()*n.length)];return`${t} ${o}`}async function pe(){const e=S($,"leaderboard");try{const n=await ce(e),t=new Set;if(n.exists()){const s=n.val();Object.values(s).forEach(a=>{a.userName&&t.add(a.userName)})}let o=0,i;do if(i=F(),o++,o>=100){const s=F();let a=1;for(i=`${s} ${a}`;t.has(i);)a++,i=`${s} ${a}`;break}while(t.has(i));return i}catch(n){return console.error("Error checking username uniqueness:",n),F()}}function z(){const e={currentPage:f,userRatings:w,userPredictions:O,totalScore:b,sessionId:c};localStorage.setItem("workshopState",JSON.stringify(e))}function fe(){try{const e=localStorage.getItem("workshopState");if(e){const n=JSON.parse(e);return f=n.currentPage||0,w=n.userRatings||{},O=n.userPredictions||{},b=n.totalScore||0,c=n.sessionId||null,!0}}catch(e){console.error("Error loading state:",e)}return!1}function he(){Object.keys(w).forEach(e=>{const n=u.findIndex(t=>t.id===e);if(n>=0){const t=document.getElementById(`rating-section-${n}`),o=document.getElementById(`results-${n}`);if(t&&(t.style.display="none"),o){o.style.display="block";const i=w[e],s=O[e];i&&s&&ie(n,e,i,s,!0)}}})}function ye(){const e=document.getElementById("username-display-home");e&&(e.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${v}</span>`),document.querySelectorAll(".page").forEach(t=>{if(t.id==="page-welcome"||t.querySelector(".username-footer"))return;const o=document.createElement("div");o.className="username-footer",o.style.cssText="margin-top: 2rem; padding-top: 0.25rem; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 0.9rem;",o.innerHTML=`Your username is <span style="color: #667eea; font-weight: 600;">${v}</span>`,t.querySelector(".container").appendChild(o)})}function be(){Y=Date.now(),g=ne,j();const e=setInterval(()=>{Date.now()-Y>=M&&clearInterval(e),j()},6e4);oe(),se(),B=setTimeout(()=>{clearInterval(e),ae()},g)}function oe(){C.forEach(e=>clearTimeout(e)),C=[],de.forEach(e=>{const n=g-e;if(n>0&&!Z.has(e)){const t=setTimeout(()=>{ve(e),Z.add(e)},n);C.push(t)}})}function se(){D&&clearTimeout(D);const e=g-ue;e>0&&g<M&&(D=setTimeout(()=>{$e()},e))}function ve(e){const n=Math.floor(e/6e4);alert(`⏰ ${n} minutes remaining in your session.`)}function $e(){if(!(g<M)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const n=Math.floor(g/6e4),t=Math.floor(M/6e4),o=Math.floor(_/6e4);confirm(`⏰ Your ${n}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${t} minutes)`)&&Se()}function Se(){B&&clearTimeout(B);const e=g+_;g=Math.min(e,M),oe(),se(),B=setTimeout(()=>{ae()},g),j();const n=Math.floor((g-(e-_))/6e4);n>0&&alert(`✅ Session extended! You have ${n} more minutes.`)}function j(){const e=Date.now()-Y,n=g-e,t=Math.floor(n/6e4),o=Object.keys(w).length,i=u.length||48,s=Math.max(0,i-o),a=document.getElementById("session-timer");a&&n>0?(a.textContent=`${t} min | ${s} paper${s!==1?"s":""} left`,n<=5*6e4?a.style.color="#f56565":n<=15*6e4?a.style.color="#fbbf24":a.style.color=""):a&&(a.textContent="Session ending...",a.style.color="#f56565")}function ae(){if(N.forEach(t=>{typeof t=="function"&&t()}),N=[],c){const t=S($,`active/${c}`);T(t,null)}B&&clearTimeout(B),D&&clearTimeout(D),C.forEach(t=>clearTimeout(t));const e=document.createElement("div");e.style.cssText=`
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
    `;const n=Math.floor((Date.now()-Y)/6e4);e.innerHTML=`
        <div>
            <h2 style="margin-bottom: 20px;">⏰ Session Expired</h2>
            <p style="margin-bottom: 20px;">
                Your ${n}-minute session has ended to conserve resources.<br>
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
    `,document.body.appendChild(e)}function we(){const e=S($,`active/${c}`);T(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{T(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{T(e,null)})}function Ee(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const n=S($,"active"),t=G(n,o=>{const i=o.val();if(e)if(i&&Object.keys(i).length>0){const s=Object.keys(i).filter(a=>{const r=i[a].timestamp;return r&&Date.now()-r<6e4}).length;s>0?(e.textContent=`${s} participant${s!==1?"s":""} active`,e.style.display="inline-block"):e.style.display="none"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});N.push(t)}async function Te(){try{J=await(await fetch("feature-order-config.json")).json(),E=(parseInt(c.split("_")[1])||Date.now())%6+1,localStorage.setItem("assignedListId",E);const t=J.find(r=>r.listId===E);W=t.featureOrder,te=t.featureLabels;const o=`rubric-v${E}.json`,[i,s,a]=await Promise.all([fetch("glossary.json").then(r=>r.json()),fetch(o).then(r=>r.json()),fetch("papers.json").then(r=>r.json())]);k=i,U=s,u=a,console.log(`Participant assigned to List ${E}:`,W),document.getElementById("total-papers").textContent=u.length}catch(e){console.error("Error loading content:",e),alert("Error loading workshop content. Please refresh the page.")}}function Be(){const e=document.getElementById("glossary-content"),n=document.getElementById("modal-glossary");if(!k||k.length===0){console.error("Glossary data not loaded");return}const t=k.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");e&&(e.innerHTML=t),n&&(n.innerHTML=t)}function Ie(){const e=document.getElementById("rubric-content"),n=document.getElementById("modal-rubric");if(!U||U.length===0){console.error("Rubric data not loaded");return}const t=`
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
                ${U.map(o=>`
                    <tr>
                        <td><strong>${o.name}</strong></td>
                        <td>${o.low}</td>
                        <td>${o.medium}</td>
                        <td>${o.high}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;e&&(e.innerHTML=t),n&&(n.innerHTML=t)}function De(){const e=document.getElementById("paper-pages");u.forEach((n,t)=>{const o=W.map((s,a)=>{const r=te[a],x=n[s];return`
                        <div class="paper-section">
                            <h3>${r}</h3>
                            <p>${x}</p>
                        </div>`}).join(""),i=`
            <div class="page" id="page-paper-${t}">
                <div class="container">
                    <div class="paper-card">
                        <div class="paper-header">
                            <div class="paper-id">${n.id}</div>
                            <h1 class="paper-title">${n.headline}</h1>
                        </div>
                        ${o}
                    </div>
                    
                    <div class="rating-section" id="rating-section-${t}">
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">1️⃣ Your Scientific Assessment</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Review all six rubric criteria. Then assign your overall quality rating:</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(s=>`
                                <div class="rating-option">
                                    <input type="radio" id="rating-${t}-${s}" 
                                           name="rating-${t}" value="${s}"
                                           onchange="enableSubmit(${t})">
                                    <label for="rating-${t}-${s}">${s}</label>
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
                                    <input type="radio" id="prediction-${t}-${s}" 
                                           name="prediction-${t}" value="${s}"
                                           onchange="enableSubmit(${t})">
                                    <label for="prediction-${t}-${s}">${s}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Low Average</span>
                            <span>High Average</span>
                        </div>
                        
                        <button class="submit-rating" id="submit-${t}" 
                                onclick="submitRating(${t}, '${n.id}')" disabled>
                            Submit Both Ratings
                        </button>
                    </div>
                    
                    <div class="results-box" id="results-${t}" style="display: none;">
                        <h3>✅ Rating Submitted!</h3>
                        <div class="score-earned">
                            <div class="score-value" id="score-${t}"></div>
                            <div class="score-message" id="score-msg-${t}"></div>
                        </div>
                        <div class="rating-comparison">
                            <div class="rating-scale-grid">
                                <div class="scale-label">Your Rating</div>
                                <div class="scale-row" id="your-rating-scale-${t}">
                                    ${[1,2,3,4,5,6,7].map(s=>`<div class="scale-cell" data-value="${s}"></div>`).join("")}
                                </div>
                            </div>
                            <div class="rating-scale-grid">
                                <div class="scale-label">Average Rating</div>
                                <div class="scale-row" id="avg-rating-scale-${t}">
                                    ${[1,2,3,4,5,6,7].map(s=>`<div class="scale-cell" data-value="${s}"></div>`).join("")}
                                </div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${t}">
                            Calculating...
                        </div>
                        <button class="btn-primary" onclick="nextPage()" style="margin-top: 1.5rem;">
                            ${t<u.length-1?"Next Paper":"View Results"}
                        </button>
                    </div>
                </div>
            </div>
        `;e.innerHTML+=i})}function V(e){console.log("showPage called with pageIndex:",e,"papers.length:",u.length),document.querySelectorAll(".page").forEach(o=>o.classList.remove("active"));let t;if(e===0)t=document.getElementById("page-welcome");else if(e===1)t=document.getElementById("page-guide");else if(e<=u.length+1){const o=e-2;console.log("Trying to show paper page:",o),t=document.getElementById(`page-paper-${o}`),console.log("Target page found:",!!t),document.getElementById("help-button").classList.add("visible"),document.getElementById("score-banner").style.display="flex"}else t=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),Ue();t?(t.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),f=e,z()}function Me(){const e=u.length+3;f<e-1&&V(f+1)}function xe(){f>0&&V(f-1)}function Re(e){const n=document.querySelector(`input[name="rating-${e}"]:checked`),t=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(n&&t)}async function Le(e,n){const t=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!t||!o){alert("Please provide both your rating and your prediction before submitting.");return}const i=parseInt(t.value),s=parseInt(o.value);try{const a=document.getElementById(`submit-${e}`);a.disabled=!0,a.textContent="Submitting...",console.log("Submitting rating:",{paperId:n,sessionId:c,rating:i,prediction:s});const r=S($,`ratings/${n}/${c}`);await T(r,{rating:i,prediction:s,listId:E,timestamp:Date.now()}),console.log("Rating submitted successfully"),w[n]=i,O[n]=s,z(),document.getElementById(`rating-section-${e}`).style.display="none",ie(e,n,i,s)}catch(a){console.error("Error submitting rating:",a),console.error("Error details:",a.code,a.message),alert(`Error submitting rating: ${a.message}

Please check the browser console for details.`);const r=document.getElementById(`submit-${e}`);r.disabled=!1,r.textContent="Submit Both Ratings"}}async function ie(e,n,t,o,i=!1){const s=document.getElementById(`results-${e}`);s.style.display="block";const a=S($,`ratings/${n}`),r=G(a,x=>{const R=x.val();if(R){const d=Object.values(R).map(l=>l.rating),m=me[n]||4,L=d.reduce((l,p)=>l+p,0)+m*ee,H=d.length+ee,h=L/H;d.length;const Q=H,X=Math.round(h),A=document.getElementById(`your-rating-scale-${e}`),q=document.getElementById(`avg-rating-scale-${e}`);if(A&&q){A.querySelectorAll(".scale-cell").forEach(y=>{y.textContent="",y.className="scale-cell"}),q.querySelectorAll(".scale-cell").forEach(y=>{y.textContent="",y.className="scale-cell"});const l=A.querySelector(`[data-value="${t}"]`);l&&(l.textContent=t,l.className=`scale-cell active rating-${t}`);const p=q.querySelector(`[data-value="${X}"]`);p&&(p.textContent=h.toFixed(1),p.className=`scale-cell active rating-${X}`)}document.getElementById(`count-${e}`).textContent=`Based on ${Q} participant${Q!==1?"s":""}`;const I=document.getElementById(`score-${e}`);if(!I.textContent&&!i){const l=Math.abs(o-h),p=Math.max(0,100-Math.round(l*12));b+=p,I.textContent=`${p}%`,I.style.fontSize="2rem",I.style.fontWeight="bold",I.style.color=p>=88?"#10b981":p>=76?"#3b82f6":p>=64?"#f59e0b":"#ef4444";const y=document.getElementById(`score-msg-${e}`);y.innerHTML=l===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${h.toFixed(1)}`:l<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — spot on!`:l<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — very close!`:l<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — well done!`:l<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${h.toFixed(1)} — science perception is tricky!`,y.style.fontSize="0.95rem",y.style.lineHeight="1.5";const P=document.getElementById("total-score-header");if(P){const re=u.length||23,le=Math.round(b/(re*100)*100);P.innerHTML=`<span class="medal-icon">🏆</span> ${le}%`,P.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>P.style.animation="",500)}j(),z()}}});N.push(r)}function Pe(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function K(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function ke(e){document.querySelectorAll(".tab-btn").forEach(n=>{n.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(n=>{n.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const n=document.getElementById("help-modal");e.target===n&&K()};window.addEventListener("keydown",function(e){if(e.key==="Escape"){const n=document.getElementById("help-modal");n&&n.classList.contains("active")&&K()}});function Ue(){const e=u.length||23,n=Math.round(b/(e*100)*100);document.getElementById("final-score").textContent=`${n}%`,console.log("Saving to leaderboard:",{sessionId:c,totalScore:b,userName:v});const t=S($,`leaderboard/${c}`);T(t,{score:b,timestamp:Date.now(),papersRated:Object.keys(w).length,userName:v,listId:E}).then(()=>{console.log("Score saved successfully")}).catch(i=>{console.error("Error saving score:",i)});const o=S($,"leaderboard");G(o,i=>{const s=i.val();if(console.log("Leaderboard data:",s),s){const a=Object.entries(s).map(([d,m])=>({id:d,score:m.score,timestamp:m.timestamp,userName:m.userName||"Anonymous"}));a.sort((d,m)=>m.score-d.score);const r=a.findIndex(d=>d.id===c)+1;document.getElementById("score-rank").textContent=`You ranked #${r} out of ${a.length} participant${a.length!==1?"s":""}!`;const R=a.slice(0,5).map((d,m)=>{const L=d.id===c;return`
                    <div class="leaderboard-entry ${L?"current-user":""}">
                        <span class="rank">${(m===0?"🥇":m===1?"🥈":m===2?"🥉":"")||`#${m+1}`}</span>
                        <span class="username">${d.userName}</span>
                        <span class="score">${d.score} pts</span>
                        ${L?'<span class="you-badge">You!</span>':""}
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=R||"<p>Be the first to complete!</p>"}})}
