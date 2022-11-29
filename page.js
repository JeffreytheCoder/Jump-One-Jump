window.onload = function () {
  const modal = document.getElementById('myModal');
  const btn = document.getElementById('question');
  const span = document.getElementsByClassName('close')[0];
  const restart = document.getElementById('restart-btn');
  const restart2 = document.getElementById('restart-btn2');
  const highest = document.getElementById('highest');

  const highestScore = localStorage.getItem('highest');
  if (!highestScore) {
    localStorage.setItem('highest', 0);
    highest.innerHTML = 0;
  } else {
    highest.innerHTML = highestScore;
  }

  // When the user clicks on the button, open the modal
  btn.onclick = function () {
    modal.style.display = 'block';
  };

  // When the user clicks on <span> (x), close the modal
  span.onclick = function () {
    modal.style.display = 'none';
  };

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function (event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };

  restart.onclick = function () {
    location.reload();
  };

  restart2.onclick = function () {
    location.reload();
  };
};
