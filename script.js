const tbody=document.querySelector('#tbl tbody');
function render(list){tbody.innerHTML='';list.forEach(c=>{tbody.innerHTML+=`<tr><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td>${c[4]}</td></tr>`})}
function filterCourses(){let q=document.getElementById('search').value.toLowerCase();render(courses.filter(c=>c[0].toLowerCase().includes(q)));}
render(courses);
