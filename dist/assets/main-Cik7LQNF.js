import"./modulepreload-polyfill-B5Qt9EMX.js";import{d as R}from"./firebase-config-BPW_mu1B.js";import{r as D,g as j,s as O,o as re}from"./firebase-4YSElDcj.js";let C=0,h=[],U=[],Y=[],E=null,$={},_={},H={},x=0,B="",q=!1,J=new Set,W={},se=!1,ge=[],Se=null;const fe=30*60*1e3,ae=5*60*1e3,z=50*60*1e3,Te=[15*60*1e3,5*60*1e3],ke=1*60*1e3;let Z=null,L=fe,N=null,G=null,Q=[],ee=[],me=new Set;const te={"STUDY-1":1,"STUDY-4":1,"STUDY-29":1,"STUDY-32":1,"STUDY-34":1,"STUDY-40":1,"STUDY-46":1,"STUDY-7":2,"STUDY-11":2,"STUDY-20":2,"STUDY-28":2,"STUDY-36":2,"STUDY-38":2,"STUDY-42":2,"STUDY-9":3,"STUDY-12":3,"STUDY-15":3,"STUDY-17":3,"STUDY-23":3,"STUDY-25":3,"STUDY-44":3,"STUDY-6":4,"STUDY-14":4,"STUDY-18":4,"STUDY-26":4,"STUDY-27":4,"STUDY-30":4,"STUDY-35":4,"STUDY-48":4,"STUDY-3":5,"STUDY-5":5,"STUDY-13":5,"STUDY-16":5,"STUDY-21":5,"STUDY-45":5,"STUDY-2":6,"STUDY-10":6,"STUDY-22":6,"STUDY-31":6,"STUDY-33":6,"STUDY-37":6,"STUDY-41":6,"STUDY-8":7,"STUDY-19":7,"STUDY-24":7,"STUDY-39":7,"STUDY-43":7,"STUDY-47":7},A=100;function ie(e){return e>=90?"🏆":e>=75?"🥇":e>=60?"🥈":"🥉"}function he(e){const t=document.getElementById(e);if(!t)return;let n=!1,o=null;t.addEventListener("mouseenter",()=>{n||(o=setTimeout(()=>{s(t)},900))}),t.addEventListener("mouseleave",()=>{o&&(clearTimeout(o),o=null)}),t.addEventListener("click",i=>{n||(i.preventDefault(),o&&(clearTimeout(o),o=null),s(t))}),t.addEventListener("touchstart",i=>{n||(i.preventDefault(),s(t))},{passive:!1}),t.addEventListener("celebrate",()=>{s(t,"celebration")}),(e==="logo-icon"||e==="navbar-logo")&&setInterval(()=>{n||(t.classList.add("shake-intense"),setTimeout(()=>{t.classList.remove("shake-intense")},2e3))},8e3);function s(i,r="mixed"){if(n&&r!=="celebration")return;n=!0;const l=["slime","slime-star","slime-heart","slime-sparkle","slime-bubble"],u=r==="celebration";i.classList.add("flipping");const d=i.src,c=d.replace("unlock-lab-icon.svg","unlock-lab-icon-inverted.svg");setTimeout(()=>{i.src=c},600),u||setTimeout(()=>{const g=i.getBoundingClientRect(),b=g.left+g.width,k=g.top,T=r==="celebration"?20:12,v=0;for(let y=0;y<T;y++){const f=document.createElement("div");if(u)f.className="slime slime-celebration-refill slime-refill";else if(r==="mixed"){const ue=l[Math.floor(Math.random()*l.length)];f.className=`slime ${ue} slime-refill`}else f.className=`slime ${r} slime-refill`;const M=b+(Math.random()-.5)*window.innerWidth*.4,I=(Math.random()-.5)*20,P=k-v+I;f.style.left=`${M}px`,f.style.top=`${v}px`,f.style.width=`${2+Math.random()*.5}vw`,f.style.height=`${(2+Math.random()*.5)*1.2}vw`,f.style.setProperty("--travel-distance",`${P}px`),f.style.animationDelay=`${y*45}ms`,a.appendChild(f)}},2500),setTimeout(()=>{i.src=d},3800);const a=document.createElement("div");a.className="slime-container",document.body.appendChild(a);const m=i.getBoundingClientRect(),p=r==="celebration"?15:8,S=u?window.innerWidth/2:m.left+m.width,w=u?0:m.top;for(let g=0;g<p;g++){const b=document.createElement("div");if(u)b.className="slime slime-celebration";else if(r==="mixed"){const f=l[Math.floor(Math.random()*l.length)];b.className=`slime ${f}`}else b.className=`slime ${r}`;const k=u?(Math.random()-.5)*window.innerWidth*1.5:(Math.random()-.5)*20,T=(Math.random()-.5)*(u?40:20),v=u?1.5+Math.random():1+Math.random()*.5,y=g*(u?40:50);b.style.left=`${S+k}px`,b.style.top=`${w+T}px`,b.style.width=`${v}vw`,b.style.height=`${v*1.2}vw`,b.style.animationDelay=`${y}ms`,a.appendChild(b)}setTimeout(()=>{const g=i.getBoundingClientRect(),b=g.left,k=g.top+g.height;for(let T=0;T<p;T++){const v=document.createElement("div");if(u)v.className="slime slime-celebration";else if(r==="mixed"){const I=l[Math.floor(Math.random()*l.length)];v.className=`slime ${I}`}else v.className=`slime ${r}`;const y=u?(Math.random()-.5)*window.innerWidth*1.5:(Math.random()-.5)*20,f=(Math.random()-.5)*(u?40:20),M=u?1.5+Math.random():1+Math.random()*.5;v.style.left=`${b+y}px`,v.style.top=`${k+f}px`,v.style.width=`${M}vw`,v.style.height=`${M*1.2}vw`,a.appendChild(v)}},600),setTimeout(()=>{i.classList.remove("flipping"),a.remove(),r!=="celebration"?n=!1:setTimeout(()=>{n=!1},500)},4e3)}}function Be(){["logo-icon","navbar-logo","guide-logo","final-logo"].forEach(t=>he(t))}document.addEventListener("DOMContentLoaded",async()=>{Be();const t=new URLSearchParams(window.location.search).get("session");if(t){document.getElementById("page-welcome").classList.remove("active"),await Je(t);return}const n=De();E||(E=Me()),B=localStorage.getItem("userName"),B||(B=await Re(),localStorage.setItem("userName",B)),xe(),await ve(),console.log("Content loaded. Papers:",h.length),console.log("Glossary items:",U?U.length:"NOT LOADED"),console.log("Rubric categories:",Y?Y.length:"NOT LOADED"),console.log("Paper data sample (first paper):",h[0]),Ne(),console.log("Paper pages generated"),h.forEach((r,l)=>{he(`paper-logo-${l}`)}),console.log("Checking if paper pages were created...");for(let r=0;r<Math.min(10,h.length);r++){const l=document.getElementById(`page-paper-${r}`);console.log(`Paper ${r} (${h[r].id}) page element:`,l?"EXISTS":"NOT FOUND")}Ce(),console.log("Rendering glossary and rubric..."),console.log("Glossary data:",U),console.log("Rubric data:",Y),le(),ce(),console.log("Glossary and rubric rendered");const o=document.getElementById("glossary-content"),s=document.getElementById("rubric-content");if(console.log("After rendering - glossary-content has HTML:",o?o.innerHTML.length>0?"YES ("+o.innerHTML.length+" chars)":"NO (empty)":"ELEMENT NOT FOUND"),console.log("After rendering - rubric-content has HTML:",s?s.innerHTML.length>0?"YES ("+s.innerHTML.length+" chars)":"NO (empty)":"ELEMENT NOT FOUND"),n&&Object.keys($).length>0&&Le(),je(),Pe(),x>0){const r=document.getElementById("total-score-header");if(r){const l=Object.keys($).length,u=l>0?Math.round(x/l):0,d=ie(u);r.innerHTML=`<span class="medal-icon">${d}</span> ${u}%`,document.getElementById("score-banner").style.display="flex"}}const i=n&&C>0?C:0;console.log("Showing page:",i,"hasState:",n,"currentPage:",C),K(i)});window.nextPage=He;window.previousPage=Ae;window.enableSubmit=qe;window.submitRating=We;window.showHelp=ze;window.closeHelp=de;window.showTab=Ve;window.finishEarly=Fe;function Me(){return"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}function oe(){const e=["Red","Blue","Green","Yellow","Purple","Orange","Pink","Teal","Brave","Wise","Swift","Tall","Happy","Clever","Bright","Quick","Mighty","Gentle","Bold","Cheerful","Curious","Friendly","Kind","Peaceful"],t=["Fox","Raccoon","Owl","Sparrow","Robin","Falcon","Eagle","Hawk","Rabbit","Squirrel","Deer","Bear","Wolf","Otter","Badger","Hedgehog","Dolphin","Seal","Penguin","Panda","Koala","Tiger","Lion","Leopard"],n=e[Math.floor(Math.random()*e.length)],o=t[Math.floor(Math.random()*t.length)],s=Math.floor(Math.random()*100).toString().padStart(2,"0");return`${n} ${o} ${s}`}async function Re(){const e=D(R,"leaderboard");try{const t=await j(e),n=new Set;if(t.exists()){const i=t.val();Object.values(i).forEach(r=>{r.userName&&n.add(r.userName)})}let o=0,s;do if(s=oe(),o++,o>=500){const i=oe();let r=1;for(s=`${i}-${r}`;n.has(s);)r++,s=`${i}-${r}`;break}while(n.has(s));return s}catch(t){return console.error("Error checking username uniqueness:",t),oe()}}function V(){const e={currentPage:C,userRatings:$,userPredictions:_,paperScores:H,totalScore:x,sessionId:E,hasUsedBackButton:q,celebratedPapers:Array.from(J),pageDisplayTimestamps:W};localStorage.setItem("workshopState",JSON.stringify(e))}function De(){try{const e=localStorage.getItem("workshopState");if(e){const t=JSON.parse(e);return C=t.currentPage||0,$=t.userRatings||{},_=t.userPredictions||{},H=t.paperScores||{},x=t.totalScore||0,E=t.sessionId||null,q=t.hasUsedBackButton||!1,J=new Set(t.celebratedPapers||[]),W=t.pageDisplayTimestamps||{},!0}}catch(e){console.error("Error loading state:",e)}return!1}function Le(){Object.keys($).forEach(e=>{const t=h.findIndex(n=>n.id===e);if(t>=0){const n=document.getElementById(`rating-section-${t}`),o=document.getElementById(`results-${t}`);if(n&&(n.style.display="none"),o){o.style.display="block";const s=H[e];if(s!==void 0){const l=document.getElementById(`score-${t}`);l&&(l.textContent=`${s}%`,l.style.fontSize="2rem",l.style.fontWeight="bold")}const i=$[e],r=_[e];i&&r&&we(t,e,i,r,!0)}}})}function Ce(){const e=document.getElementById("navbar-username");e&&(e.textContent=B);const t=document.getElementById("username-display-save");t&&(t.textContent=B);const n=document.getElementById("username-display-inline");n&&(n.textContent=B)}function xe(){Z=Date.now(),L=fe,X();const e=setInterval(()=>{Date.now()-Z>=z&&clearInterval(e),X()},6e4);pe(),ye(),N=setTimeout(()=>{clearInterval(e),be()},L)}function pe(){Q.forEach(e=>clearTimeout(e)),Q=[],Te.forEach(e=>{const t=L-e;if(t>0&&!me.has(e)){const n=setTimeout(()=>{Ue(e),me.add(e)},t);Q.push(n)}})}function ye(){G&&clearTimeout(G);const e=L-ke;e>0&&L<z&&(G=setTimeout(()=>{Ye()},e))}function Ue(e){const t=Math.floor(e/6e4);alert(`⏰ ${t} minutes remaining in your session.`)}function Ye(){if(!(L<z)){alert("⏰ Your session will end in 1 minute. This is the maximum session duration.");return}const t=Math.floor(L/6e4),n=Math.floor(z/6e4),o=Math.floor(ae/6e4);confirm(`⏰ Your ${t}-minute session will end in 1 minute.

Would you like to extend for ${o} more minutes?
(Maximum total: ${n} minutes)`)&&Ie()}function Ie(){N&&clearTimeout(N);const e=L+ae;L=Math.min(e,z),pe(),ye(),N=setTimeout(()=>{be()},L),X();const t=Math.floor((L-(e-ae))/6e4);t>0&&alert(`✅ Session extended! You have ${t} more minutes.`)}function X(){const e=Date.now()-Z,t=L-e,n=Math.floor(t/6e4),o=Object.keys($).length,s=h.length||48,i=Math.max(0,s-o),r=document.getElementById("session-timer");r&&t>0?(r.textContent=`${n} min | ${i} paper${i!==1?"s":""} left`,t<=5*6e4?r.style.color="#f56565":t<=15*6e4?r.style.color="#fbbf24":r.style.color=""):r&&(r.textContent="Session ending...",r.style.color="#f56565")}function be(){if(ee.forEach(n=>{typeof n=="function"&&n()}),ee=[],E){const n=D(R,`active/${E}`);O(n,null)}N&&clearTimeout(N),G&&clearTimeout(G),Q.forEach(n=>clearTimeout(n));const e=document.createElement("div");e.style.cssText=`
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
    `;const t=Math.floor((Date.now()-Z)/6e4);e.innerHTML=`
        <div>
            <h2 style="margin-bottom: 20px; color: white;">⏰ Session Expired</h2>
            <p style="margin-bottom: 20px; color: white;">
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
    `,document.body.appendChild(e)}function je(){const e=D(R,`active/${E}`);O(e,{joinedAt:Date.now(),lastActive:Date.now()}),setInterval(()=>{O(e,{joinedAt:Date.now(),lastActive:Date.now()})},3e4),window.addEventListener("beforeunload",()=>{O(e,null)})}function Pe(){const e=document.getElementById("participant-counter");e&&(e.style.display="none");const t=D(R,"active"),n=re(t,o=>{const s=o.val();if(e)if(s&&Object.keys(s).length>0){const i=Object.keys(s).filter(r=>{const l=s[r].timestamp;return l&&Date.now()-l<6e4}).length;i>0?(e.textContent=`${i} participant${i!==1?"s":""} active`,e.style.display="inline-block"):e.style.display="none"}else e.style.display="none"},o=>{console.error("Error updating participant count:",o),e&&(e.style.display="none")});ee.push(n)}function Oe(){if(!h||!h.length||!E){console.warn("Cannot shuffle papers: papers or sessionId not initialized");return}let e=0;for(let n=0;n<E.length;n++)e=(e<<5)-e+E.charCodeAt(n),e=e&e;function t(){return e=(e*9301+49297)%233280,e/233280}for(let n=h.length-1;n>0;n--){const o=Math.floor(t()*(n+1));[h[n],h[o]]=[h[o],h[n]]}}async function ve(e=!0){try{const t=await fetch("/feature-order-config.json");if(!t.ok)throw new Error(`Failed to load feature-order-config.json: ${t.status}`);ge=await t.json();const[n,o,s,i,r,l,u,d]=await Promise.all([fetch("/glossary.json").then(a=>{if(!a.ok)throw new Error(`glossary.json: ${a.status}`);return a.json()}),fetch("/rubric-v1.json").then(a=>{if(!a.ok)throw new Error(`rubric-v1.json: ${a.status}`);return a.json()}),fetch("/rubric-v2.json").then(a=>{if(!a.ok)throw new Error(`rubric-v2.json: ${a.status}`);return a.json()}),fetch("/rubric-v3.json").then(a=>{if(!a.ok)throw new Error(`rubric-v3.json: ${a.status}`);return a.json()}),fetch("/rubric-v4.json").then(a=>{if(!a.ok)throw new Error(`rubric-v4.json: ${a.status}`);return a.json()}),fetch("/rubric-v5.json").then(a=>{if(!a.ok)throw new Error(`rubric-v5.json: ${a.status}`);return a.json()}),fetch("/rubric-v6.json").then(a=>{if(!a.ok)throw new Error(`rubric-v6.json: ${a.status}`);return a.json()}),fetch("/papers.json").then(a=>{if(!a.ok)throw new Error(`papers.json: ${a.status}`);return a.json()})]);U=n,window.allRubrics=[o,s,i,r,l,u],Y=o,h=d,e&&E&&Oe();const c=document.getElementById("total-papers");c&&(c.textContent=Object.keys($).length||0)}catch(t){console.error("Error loading content:",t),console.error("Error details:",t.message),alert(`Error loading workshop content: ${t.message}

Please try:
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Contact support if issue persists`)}}function le(){console.log("renderGlossary called");const e=document.getElementById("glossary-content"),t=document.getElementById("modal-glossary");if(console.log("Glossary content element:",e),console.log("Modal glossary element:",t),console.log("Glossary data:",U),!U||U.length===0){console.error("Glossary data not loaded or empty",U);const o='<p style="color: red;">Error: Glossary data failed to load. Please refresh the page.</p>';e&&(e.innerHTML=o),t&&(t.innerHTML=o);return}const n=U.map(o=>`
        <div class="glossary-item">
            <div class="glossary-term">${o.term}</div>
            <div class="glossary-definition">${o.definition}</div>
        </div>
    `).join("");console.log("Generated glossary HTML length:",n.length),console.log("Generated glossary HTML (first 200 chars):",n.substring(0,200)),e?(e.innerHTML=n,console.log("Glossary content updated. Element now contains:",e.innerHTML.substring(0,200))):console.error("glossary-content element not found in DOM"),t?(t.innerHTML=n,console.log("Modal glossary updated")):console.warn("modal-glossary element not found in DOM (this is OK if modal not on current page)")}function ce(){console.log("renderRubric called");const e=document.getElementById("rubric-content"),t=document.getElementById("modal-rubric");if(console.log("Rubric content element:",e),console.log("Modal rubric element:",t),console.log("Rubric data:",Y),!Y||Y.length===0){console.error("Rubric data not loaded or empty",Y);const s='<p style="color: red;">Error: Rubric data failed to load. Please refresh the page.</p>';e&&(e.innerHTML=s),t&&(t.innerHTML=s);return}const n=s=>{const i=s.indexOf(":");if(i===-1)return s;const r=s.substring(0,i+1),l=s.substring(i+1);return`<strong>${r}</strong>${l}`},o=`
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
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
                    ${Y.map(s=>`
                        <tr>
                            <td><strong>${s.name}</strong></td>
                            <td>${n(s.low)}</td>
                            <td>${n(s.medium)}</td>
                            <td>${n(s.high)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;console.log("Generated rubric HTML length:",o.length),console.log("Generated rubric HTML (first 200 chars):",o.substring(0,200)),e?(e.innerHTML=o,console.log("Rubric content updated. Element now contains:",e.innerHTML.substring(0,200))):console.error("rubric-content element not found in DOM"),t?(t.innerHTML=o,console.log("Modal rubric updated")):console.warn("modal-rubric element not found in DOM (this is OK if modal not on current page)")}function Ne(){const e=document.getElementById("paper-pages");h.forEach((t,n)=>{const o=n%6,s=ge[o],i=s.featureOrder,r=s.featureLabels,l=i.map((d,c)=>{if(d==="title")return"";const a=r[c],m=t[d];return`
                        <div class="paper-section">
                            <h3>${a}</h3>
                            <p>${m}</p>
                        </div>`}).filter(d=>d!=="").join(""),u=`
            <div class="page" id="page-paper-${n}">
                <div class="container">
                    <button class="back-to-previous-btn" onclick="goBackToPreviousStudy()" style="${q||n===0?"display: none;":""}" title="Go back to previous study (one-time use)">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        <span>Back to Previous Study</span>
                    </button>
                    <div class="paper-card">
                        <div class="paper-header">
                            <h1 class="paper-title">${t.title}</h1>
                        </div>
                        ${l}
                    </div>
                    
                    <div class="rating-section" id="rating-section-${n}">
                        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #ff9800;">
                            <h3 style="margin: 0 0 10px 0; color: #f57c00;">1️⃣ Predict the Crowd</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Guess: What will the AVERAGE rating be from all workshop participants? Will others catch the same flaws you did?</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(d=>`
                                <div class="rating-option">
                                    <input type="radio" id="prediction-${n}-${d}" 
                                           name="prediction-${n}" value="${d}"
                                           onchange="enableSubmit(${n})">
                                    <label for="prediction-${n}-${d}">${d}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Low Average</span>
                            <span>High Average</span>
                        </div>
                        
                        <div style="background: #f0f4ff; padding: 15px; border-radius: 8px; margin: 30px 0 15px 0; border-left: 4px solid #667eea;">
                            <h3 style="margin: 0 0 10px 0; color: #667eea;">2️⃣ Your Scientific Assessment</h3>
                            <p style="font-size: 0.95rem; color: #444; margin: 0;">Review all six rubric criteria. Then assign your overall quality rating:</p>
                        </div>
                        <div class="rating-scale">
                            ${[1,2,3,4,5,6,7].map(d=>`
                                <div class="rating-option">
                                    <input type="radio" id="rating-${n}-${d}" 
                                           name="rating-${n}" value="${d}"
                                           onchange="enableSubmit(${n})">
                                    <label for="rating-${n}-${d}">${d}</label>
                                </div>
                            `).join("")}
                        </div>
                        <div class="rating-labels">
                            <span>Poor Quality</span>
                            <span>Excellent Quality</span>
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
                            <div class="rating-scale-grid">
                                <div class="scale-label">Average Rating</div>
                                <div class="scale-row" id="avg-rating-scale-${n}">
                                    ${[1,2,3,4,5,6,7].map(d=>`<div class="scale-cell" data-value="${d}"></div>`).join("")}
                                </div>
                            </div>
                            <div class="rating-scale-grid">
                                <div class="scale-label">Your Rating</div>
                                <div class="scale-row" id="your-rating-scale-${n}">
                                    ${[1,2,3,4,5,6,7].map(d=>`<div class="scale-cell" data-value="${d}"></div>`).join("")}
                                </div>
                            </div>
                        </div>
                        <div class="participant-count" id="count-${n}">
                            Calculating...
                        </div>
                        <div class="navigation-buttons" style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
                            <button class="btn-primary" onclick="nextPage()">
                                ${n<h.length-1?"Next Paper":"View Results"}
                            </button>
                            <button class="btn-finish" id="finish-btn-${n}" onclick="finishEarly()" style="display: none;">
                                Finish & View Results
                            </button>
                        </div>
                    </div>
                    
                    <div class="page-logo-footer">
                        <img id="paper-logo-${n}" src="unlock-lab-icon.svg" alt="Logo" class="page-logo">
                    </div>
                </div>
            </div>
        `;e.innerHTML+=u})}function K(e){document.querySelectorAll(".page").forEach(i=>i.classList.remove("active"));let n;const o=document.getElementById("navbar-paper-number"),s=document.getElementById("navbar-username");if(e===0)n=document.getElementById("page-welcome"),o&&(o.style.display="none"),s&&(s.style.display="none"),document.getElementById("help-button").classList.remove("visible");else if(e===1)n=document.getElementById("page-guide"),o&&(o.style.display="none"),s&&(s.style.display="none"),document.getElementById("help-button").classList.remove("visible");else if(e<=h.length+1){const i=e-2;n=document.getElementById(`page-paper-${i}`),document.getElementById("help-button").classList.add("visible");const r=h[i].id;if(W[r]=Date.now(),o){const d=Object.keys($).length;o.textContent=`${d}`,o.style.display="inline"}s&&(s.style.display="none");const l=Object.keys($).length;(l>0?Math.round(x/l):0)>0&&(document.getElementById("score-banner").style.display="flex")}else n=document.getElementById("page-final"),document.getElementById("help-button").classList.remove("visible"),o&&(o.style.display="none"),s&&(s.style.display="inline"),$e();n?(n.classList.add("active"),window.scrollTo(0,0)):console.error("Target page not found for pageIndex:",e),C=e,V()}function He(){const e=h.length+3;C<e-1&&K(C+1)}function Ae(){C>0&&K(C-1)}function Fe(){if(Object.keys($).length<12){alert("Please rate at least 12 studies before finishing.");return}const t=h.length+2;K(t)}function Ge(){q||C>2&&(q=!0,V(),document.querySelectorAll(".back-to-previous-btn").forEach(t=>{t.style.display="none"}),K(C-1))}window.goBackToPreviousStudy=Ge;function qe(e){const t=document.querySelector(`input[name="rating-${e}"]:checked`),n=document.querySelector(`input[name="prediction-${e}"]:checked`),o=document.getElementById(`submit-${e}`);o.disabled=!(t&&n)}async function We(e,t){const n=document.querySelector(`input[name="rating-${e}"]:checked`),o=document.querySelector(`input[name="prediction-${e}"]:checked`);if(!n||!o){alert("Please provide both your rating and your prediction before submitting.");return}if(Object.keys($).length>=24){alert("You have reached the maximum of 24 ratings. Please proceed to view your results.");return}const i=parseInt(n.value),r=parseInt(o.value);try{const l=document.getElementById(`submit-${e}`);l.disabled=!0,l.textContent="Submitting...";const u=D(R,`ratings/${t}`),c=(await j(u)).val();let a=4;if(c){const w=Object.values(c).map(T=>T.rating),g=te[t]||4,b=w.reduce((T,v)=>T+v,0)+g*A,k=w.length+A;a=b/k}else a=te[t]||4;$[t]=i,_[t]=r,V(),document.getElementById(`rating-section-${e}`).style.display="none",we(e,t,i,r,!1,a);const m=e%6+1,p=W[t]?Date.now()-W[t]:null,S=D(R,`ratings/${t}/${E}`);await O(S,{rating:i,prediction:r,rubricVersion:m,responseTime:p,timestamp:Date.now()})}catch(l){console.error("Error submitting rating:",l),console.error("Error details:",l.code,l.message),alert(`Error submitting rating: ${l.message}

Please check the browser console for details.`);const u=document.getElementById(`submit-${e}`);u.disabled=!1,u.textContent="Submit Both Ratings"}}async function we(e,t,n,o,s=!1,i=null){const r=document.getElementById(`results-${e}`);if(r.style.display="block",i!==null){const d=document.getElementById(`score-${e}`);if(!d.textContent){const c=Math.abs(o-i),a=Math.max(0,100-Math.round(c*12));H[t]=a,d.textContent=`${a}%`,d.style.fontSize="2rem",d.style.fontWeight="bold";const m=document.getElementById(`score-msg-${e}`);if(m.innerHTML=c===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${i.toFixed(1)}`:c<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${i.toFixed(1)} — spot on!`:c<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${i.toFixed(1)} — very close!`:c<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${i.toFixed(1)} — well done!`:c<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${i.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${i.toFixed(1)} — science perception is tricky!`,m.style.fontSize="0.95rem",m.style.lineHeight="1.5",a>=90&&!J.has(t)){J.add(t);const g=document.getElementById(`paper-logo-${e}`);g&&setTimeout(()=>{g.dispatchEvent(new CustomEvent("celebrate"))},500)}const p=document.getElementById("total-score-header"),S=document.getElementById("score-banner");if(p){const g=Object.keys($).length,b=g>0?Math.round(x/g):0;if(b>0){const k=ie(b);p.innerHTML=`<span class="medal-icon">${k}</span> ${b}%`,p.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>p.style.animation="",500),S&&(S.style.display="flex")}else S&&(S.style.display="none")}X(),V();const w=Object.keys($).length;if(w===12){const g=document.getElementById(`paper-logo-${e}`);g&&setTimeout(()=>{g.dispatchEvent(new CustomEvent("celebrate"))},800),setTimeout(()=>{alert("Rated 12 papers! Rate a few more papers (recommended) or proceed to view your results.")},1200)}if(w>=12&&e<h.length-1){const g=document.getElementById(`finish-btn-${e}`);g&&(g.style.display="block")}}}const l=D(R,`ratings/${t}`),u=re(l,d=>{const c=d.val();if(c){const a=Object.values(c).map(y=>y.rating),m=te[t]||4,p=a.reduce((y,f)=>y+f,0)+m*A,S=a.length+A,w=p/S,g=a.length,b=Math.round(w),k=document.getElementById(`your-rating-scale-${e}`),T=document.getElementById(`avg-rating-scale-${e}`);if(k&&T){k.querySelectorAll(".scale-cell").forEach(M=>{M.textContent="",M.className="scale-cell"}),T.querySelectorAll(".scale-cell").forEach(M=>{M.textContent="",M.className="scale-cell"});const y=k.querySelector(`[data-value="${n}"]`);y&&(y.textContent=n,y.className=`scale-cell active rating-${n}`);const f=T.querySelector(`[data-value="${b}"]`);f&&(f.textContent=w.toFixed(1),f.className=`scale-cell active rating-${b}`)}document.getElementById(`count-${e}`).textContent=`Based on ${g} participant${g!==1?"s":""}`;const v=document.getElementById(`score-${e}`);if(!v.textContent&&!s){const y=Math.abs(o-w),f=Math.max(0,100-Math.round(y*12));H[t]=f,x+=f,v.textContent=`${f}%`,v.style.fontSize="2rem",v.style.fontWeight="bold",v.style.color=f>=88?"#10b981":f>=76?"#3b82f6":f>=64?"#f59e0b":"#ef4444";const M=document.getElementById(`score-msg-${e}`);M.innerHTML=y===0?`<strong>🎯 Perfect prediction!</strong><br>You nailed it: ${o} = ${w.toFixed(1)}`:y<=.5?`<strong>⭐ Outstanding!</strong><br>Predicted ${o}, actual ${w.toFixed(1)} — spot on!`:y<=1?`<strong>🎪 Excellent work!</strong><br>Predicted ${o}, actual ${w.toFixed(1)} — very close!`:y<=1.5?`<strong>👍 Great prediction!</strong><br>Predicted ${o}, actual ${w.toFixed(1)} — well done!`:y<=2.5?`<strong>👌 Good attempt!</strong><br>Predicted ${o}, actual ${w.toFixed(1)} — getting there!`:`<strong>💪 Keep learning!</strong><br>Predicted ${o}, actual ${w.toFixed(1)} — science perception is tricky!`,M.style.fontSize="0.95rem",M.style.lineHeight="1.5";const I=document.getElementById("total-score-header"),P=document.getElementById("score-banner");if(I){const F=Object.keys($).length,ne=F>0?Math.round(x/F):0;if(ne>0){const Ee=ie(ne);I.innerHTML=`<span class="medal-icon">${Ee}</span> ${ne}%`,I.style.animation="scoreUpdate 0.5s ease",setTimeout(()=>I.style.animation="",500),P&&(P.style.display="flex")}else P&&(P.style.display="none")}if(X(),V(),Object.keys($).length>=12&&e<h.length-1){const F=document.getElementById(`finish-btn-${e}`);F&&(F.style.display="block")}}}});ee.push(u)}function ze(){document.getElementById("help-modal").classList.add("active"),document.body.style.overflow="hidden"}function de(){document.getElementById("help-modal").classList.remove("active"),document.body.style.overflow="auto"}function Ve(e){document.querySelectorAll(".tab-btn").forEach(t=>{t.classList.remove("active")}),event.target.classList.add("active"),document.querySelectorAll(".tab-content").forEach(t=>{t.classList.remove("active")}),e==="glossary"?document.getElementById("modal-glossary").classList.add("active"):document.getElementById("modal-rubric").classList.add("active")}window.onclick=function(e){const t=document.getElementById("help-modal");e.target===t&&de()};window.addEventListener("keydown",function(e){if(e.key==="Escape"){const t=document.getElementById("help-modal");t&&t.classList.contains("active")&&de()}});function $e(){le(),ce(),se||(x=Object.values(H).reduce((s,i)=>s+i,0));const e=Object.keys($).length,t=e>0?Math.round(x/e):0;document.getElementById("final-score").textContent=`${t}%`;const n=document.getElementById("total-papers");if(n&&(n.textContent=e),se){const s=document.getElementById("save-results-section");s&&(s.style.display="none"),document.getElementById("username-display-save").textContent=B,document.getElementById("username-display-inline").textContent=B}else{const s=D(R,`leaderboard/${E}`);O(s,{score:x,timestamp:Date.now(),papersRated:Object.keys($).length,userName:B,listId:Se}).then(()=>{document.getElementById("save-results-link").style.display="inline-block",document.getElementById("email-results-link").style.display="inline-block",document.getElementById("username-display-save").textContent=B,document.getElementById("username-display-inline").textContent=B}).catch(i=>{console.error("Error saving score:",i)})}Xe();const o=D(R,"leaderboard");re(o,s=>{const i=s.val();if(i){const r=Object.entries(i).map(([c,a])=>({id:c,score:a.score,timestamp:a.timestamp,userName:a.userName||"Anonymous",papersRated:a.papersRated||0}));r.sort((c,a)=>a.score-c.score);const l=r.findIndex(c=>c.id===E)+1;document.getElementById("score-rank").textContent=`You ranked #${l} out of ${r.length} participant${r.length!==1?"s":""}!`;const d=r.slice(0,5).map((c,a)=>{const m=c.id===E,p=a===0?"🥇":a===1?"🥈":a===2?"🥉":"",S=c.papersRated>0?Math.round(c.score/c.papersRated):0;return`
                    <div class="leaderboard-entry ${m?"current-user":""}">
                        <span class="rank">${p||`#${a+1}`}</span>
                        <div class="username-container">
                            <span class="username">${c.userName}</span>
                            ${m?'<span class="you-badge">You!</span>':""}
                        </div>
                        <span class="score">${S}%</span>
                    </div>
                `}).join("");document.getElementById("leaderboard-list").innerHTML=d||"<p>Be the first to complete!</p>"}})}async function Xe(){try{const e={},t=h.map(async m=>{const p=D(R,`ratings/${m.id}`),w=(await j(p)).val();if(w){const g=Object.values(w).map(y=>y.rating),b=te[m.id]||4,k=g.reduce((y,f)=>y+f,0)+b*A,T=g.length+A,v=k/T;e[m.id]={average:v,userRating:$[m.id]||null}}});await Promise.all(t);const n=[],o=[],s=[],i=[];if(h.forEach(m=>{if(e[m.id]&&e[m.id].userRating!==null){const p=e[m.id].userRating,S=e[m.id].average,w=p-S;n.push(w),o.push(p),s.push(S),i.push(m.id)}}),n.length===0)return;const r=n.reduce((m,p)=>m+p,0)/n.length,l=n.reduce((m,p)=>m+Math.pow(p-r,2),0)/n.length,u=Math.sqrt(l),d=n.map(m=>Math.abs(m)),c=d.reduce((m,p)=>m+p,0)/d.length;let a="";c<.5&&u<.8?a=`🎯 <strong>Spot-On Evaluator!</strong> Your ratings are remarkably well-aligned with the crowd. On average, you deviated by just ${c.toFixed(2)} points from other participants' ratings. Your assessments are well backed by both the baseline quality indicators and the collective wisdom of other evaluators. You're in sync with the scientific consensus!`:c<1&&u<1.5?a=`✓ <strong>Calibrated Scientist.</strong> Your ratings align well with the crowd, averaging ${c.toFixed(2)} points from the consensus. You're consistently backed by other participants' evaluations, showing you've developed a reliable eye for research quality that matches the collective assessment.`:c>2||u>2.5?a=`🌟 <strong>Breaking the Mould!</strong> Your ratings deviate substantially from the crowd (average difference: ${c.toFixed(2)} points). You're seeing research quality through a unique lens—perhaps you're more critical of methodological flaws, or more generous with preliminary findings. Your independent perspective challenges the consensus!`:a=`⚖️ <strong>Balanced Contrarian.</strong> Your ratings show notable differences from the average (typical deviation: ${c.toFixed(2)} points). You're neither slavishly following the crowd nor wildly divergent—you're bringing a thoughtful, independent perspective whilst still engaging with the scientific consensus.`,document.getElementById("analysis-summary").innerHTML=a,document.getElementById("rating-analysis").style.display="block",_e(i,o,s)}catch(e){console.error("Error calculating rating analysis:",e)}}function _e(e,t,n){const o=document.getElementById("comparison-chart");o&&new Chart(o,{type:"line",data:{labels:e,datasets:[{label:"Your Ratings",data:t,borderColor:"#667eea",backgroundColor:"rgba(102, 126, 234, 0.1)",borderWidth:3,pointRadius:5,pointBackgroundColor:"#667eea",tension:0},{label:"Crowd Average",data:n,borderColor:"#10b981",backgroundColor:"rgba(16, 185, 129, 0.1)",borderWidth:2,borderDash:[5,5],pointRadius:4,pointBackgroundColor:"#10b981",tension:0}]},options:{responsive:!0,maintainAspectRatio:!1,aspectRatio:2,plugins:{legend:{display:!0,position:"top",labels:{font:{size:12,weight:"bold"}}},tooltip:{callbacks:{label:function(s){return`${s.dataset.label}: ${s.parsed.y.toFixed(2)}`}}}},scales:{y:{beginAtZero:!1,min:1,max:7,title:{display:!0,text:"Rating (1-7 scale)",font:{size:14,weight:"bold"}},ticks:{stepSize:1}},x:{title:{display:!0,text:"Studies",font:{size:14,weight:"bold"}},ticks:{maxRotation:45,minRotation:45,font:{size:9}}}}}})}function Ke(){const e=`${window.location.origin}${window.location.pathname}?session=${E}`;navigator.clipboard.writeText(e).then(()=>{document.getElementById("link-copied-msg").style.display="block",setTimeout(()=>{document.getElementById("link-copied-msg").style.display="none"},3e3)}).catch(t=>{console.error("Failed to copy link:",t),alert("Failed to copy link. Please copy manually: "+e)})}window.copyResultsLink=Ke;function Qe(){const e=`${window.location.origin}${window.location.pathname}?session=${E}`,t=`${window.location.origin}/dashboard.html`,n=encodeURIComponent("Your Unlock the Lab Results"),o=encodeURIComponent(`Hello ${B},

Here are your Unlock the Lab workshop results:

Your Username: ${B}

Direct Link to Your Results:
${e}

You can also visit the Live Dashboard and enter your username to find your results:
${t}

The dashboard shows real-time statistics and comparisons for all participants.

Thank you for participating!

---
Unlock the Lab Workshop
Dr Pablo Bernabeu, University of Oxford`);window.location.href=`mailto:?subject=${n}&body=${o}`}window.emailResultsLink=Qe;async function Je(e){try{se=!0,await ve(!1),le(),ce();const t=u=>u.toLowerCase().replace(/\s+/g,"");let n=D(R,`leaderboard/${e}`),o=await j(n),s=e;if(!o.exists()){const u=t(e),d=D(R,"leaderboard"),c=await j(d);if(c.exists()){const a=c.val(),m=Object.keys(a).find(p=>t(p)===u);m&&(s=m,n=D(R,`leaderboard/${m}`),o=await j(n))}}if(!o.exists()){alert("Username not found. Please check your username and try again."),window.location.href=window.location.pathname;return}const i=o.val();if(E=s,B=i.userName||"Anonymous",x=i.score||0,!h||!h.length)throw new Error("Papers data failed to load");const r=h.map(async u=>{const d=D(R,`ratings/${u.id}/${s}`),c=await j(d);if(c.exists()){const a=c.val();$[u.id]=a.rating,_[u.id]=a.prediction}});await Promise.all(r),document.getElementById("page-welcome").classList.remove("active"),document.getElementById("page-final").classList.add("active"),$e();const l=document.getElementById("total-papers");l&&(l.textContent=Object.keys($).length)}catch(t){console.error("Error loading session results:",t),alert("Error loading results. Please try again."),window.location.href=window.location.pathname}}
