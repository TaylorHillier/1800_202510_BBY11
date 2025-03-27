function logout() {
    firebase.auth().signOut().then(() => {
        // Sign-out successful.
        console.log("logging out user");
      }).catch((error) => {
        // An error happened.
      });
}

function setNav() {

  firebase.auth().onAuthStateChanged(user => {
    if (user) {                   
      document.getElementById("navigation").insertAdjacentHTML("afterbegin", 
        `<nav>
          <ul class="nav-list">
              <li class="nav-item">
                  <a href="main.html"  class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                          <path d="M22 11.414v12.586h-20v-12.586l-1.293 1.293-.707-.707 12-12 12 12-.707.707-1.293-1.293zm-6 11.586h5v-12.586l-9-9-9 9v12.586h5v-9h8v9zm-1-7.889h-6v7.778h6v-7.778z"/>
                      </svg>
                      <p>Dashboard</p>
                  </a>
              </li>
              <li class="nav-item">
                  <a href="dependants.html"  class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                          <path d="M22 6c1.104 0 2 .896 2 2v12c0 1.104-.896 2-2 2h-20c-1.104 0-2-.896-2-2v-12c0-1.104.896-2 2-2h5v-2c0-1.104.896-2 2-2h6c1.104 0 2 .896 2 2v2h5zm0 2.5c0-.276-.224-.5-.5-.5h-19c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h19c.276 0 .5-.224.5-.5v-11zm-9 4.5h3v2h-3v3h-2v-3h-3v-2h3v-3h2v3zm1.5-9h-5c-.276 0-.5.224-.5.5v1.5h6v-1.5c0-.276-.224-.5-.5-.5"/>
                      </svg>
                      <p>My Dependants</p>
                  </a>
              </li>
              <li class="nav-item">
                  <a href="caretaker-schedule.html"  class="nav-link">
                      <svg clip-rule="evenodd" fill-rule="evenodd" width="24" height="24" stroke-linejoin="round" stroke-miterlimit="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="m11.25 6c.398 0 .75.352.75.75 0 .414-.336.75-.75.75-1.505 0-7.75 0-7.75 0v12h17v-8.749c0-.414.336-.75.75-.75s.75.336.75.75v9.249c0 .621-.522 1-1 1h-18c-.48 0-1-.379-1-1v-13c0-.481.38-1 1-1zm1.521 9.689 9.012-9.012c.133-.133.217-.329.217-.532 0-.179-.065-.363-.218-.515l-2.423-2.415c-.143-.143-.333-.215-.522-.215s-.378.072-.523.215l-9.027 8.996c-.442 1.371-1.158 3.586-1.264 3.952-.126.433.198.834.572.834.41 0 .696-.099 4.176-1.308zm-2.258-2.392 1.17 1.171c-.704.232-1.274.418-1.729.566zm.968-1.154 7.356-7.331 1.347 1.342-7.346 7.347z" fill-rule="nonzero"/>
                      </svg>
                      <p>My Schedule</p>
                  </a>
              </li>    
              <li class="nav-item">
                  <a href="profile.html" class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                          <path d="M12 0c6.623 0 12 5.377 12 12s-5.377 12-12 12-12-5.377-12-12 5.377-12 12-12zm0 1c6.071 0 11 4.929 11 11s-4.929 11-11 11-11-4.929-11-11 4.929-11 11-11zm0 10c-2.209 0-4 1.792-4 4 0 .665.163 1.294.457 1.847-1.534.773-3.457 1.69-3.457 3.153 0 1.657 3.134 3 7 3s7-1.343 7-3c0-1.463-1.923-2.38-3.457-3.153.294-.553.457-1.182.457-1.847 0-2.208-1.791-4-4-4zm0 1c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3zm0 9c-3.211 0-6-.832-6-2 0-.512.856-1.229 2.186-1.793.603.596 1.765 1.026 3.051 1.239-.214.388-.237.819-.237 1.554h2c0-1.021.023-1.411.237-1.554 1.286-.213 2.448-.643 3.051-1.239 1.33.564 2.186 1.281 2.186 1.793 0 1.168-2.789 2-6 2z"/>
                      </svg>
                      <p>My Profile</p>
                  </a>
              </li>                   
              <li class="nav-item">
                  <a onclick="logout()" class="nav-link" href="index.html">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                          <path d="M24 21h-24v-18h24v18zm-23-16.477v15.477h22v-15.477l-10.999 10-11.001-10zm21.089-.523h-20.176l10.088 9.171 10.088-9.171z"/>
                      </svg>
                      <p>Log Out</p>
                  </a>
              </li>
          </ul>
      </nav>`
      );
    } else {
      document.getElementById("navigation").insertAdjacentHTML("afterbegin", 
      `<nav>
          <ul class="nav-list-unlogged">
              <li class="nav-item-unlogged">
                  <a href="index.html"  class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M22 11.414v12.586h-20v-12.586l-1.293 1.293-.707-.707 12-12 12 12-.707.707-1.293-1.293zm-6 11.586h5v-12.586l-9-9-9 9v12.586h5v-9h8v9zm-1-7.889h-6v7.778h6v-7.778z"></path>
                      </svg>
                      <p>Home</p>
                  </a>
              </li>
                <li class="nav-item-unlogged">
                  <a href="login.html"  class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M22 6c1.104 0 2 .896 2 2v12c0 1.104-.896 2-2 2h-20c-1.104 0-2-.896-2-2v-12c0-1.104.896-2 2-2h5v-2c0-1.104.896-2 2-2h6c1.104 0 2 .896 2 2v2h5zm0 2.5c0-.276-.224-.5-.5-.5h-19c-.276 0-.5.224-.5.5v11c0 .276.224.5.5.5h19c.276 0 .5-.224.5-.5v-11zm-9 4.5h3v2h-3v3h-2v-3h-3v-2h3v-3h2v3zm1.5-9h-5c-.276 0-.5.224-.5.5v1.5h6v-1.5c0-.276-.224-.5-.5-.5"></path></svg>
                      <p>Login</p>
                  </a>
              </li>
              <li class="nav-item-unlogged">
                  <a href="about.html" class="nav-link">
                      <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd">
                              <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10-10-4.477-10-10 4.477-10 10-10zm0 1.5c-4.687 0-8.5 3.813-8.5 8.5s3.813 8.5 8.5 8.5 8.5-3.813 8.5-8.5-3.813-8.5-8.5-8.5zm.75 12.75h-1.5v-1.5h1.5v1.5zm0-3h-1.5v-6h1.5v6z"></path>
                      </svg>
                      <p>About</p>
                  </a>
              </li>
          </ul>
      </nav>`);
    }
});
}
setNav();