(async function () {

$("#toolbarButtonClassChooser").click();

while(
    !$("#classChooserGrid").length ||
    !$("#classChooserGrid").jqGrid
){
    await new Promise(r=>setTimeout(r,100));
}

await new Promise(r=>setTimeout(r,500));


const classes=$("#classChooserGrid").jqGrid("getRowData");

$(".ui-dialog-titlebar-close").click();


if(!classes.length){
    alert("No classes found.");
    return;
}


/* ---------------- SETTINGS ---------------- */

document.getElementById("gradingSheetOverlay")?.remove();

const overlay=document.createElement("div");
overlay.id="gradingSheetOverlay";

overlay.style.cssText=`
position:fixed;
inset:0;
background:rgba(0,0,0,.4);
z-index:999999;
display:flex;
align-items:center;
justify-content:center;
font-family:Arial;
`;


overlay.innerHTML=`

<div style="
background:white;
padding:20px;
border-radius:10px;
width:450px;
box-shadow:0 0 20px black;
">

<h2>Grading Sheet Setup</h2>


<label>
Number of assignment columns:
</label>

<input id="colCount"
type="number"
value="12"
min="1"
max="20"
style="width:100%;font-size:16px">


<br><br>


<label>
Assignment names:
</label>


<select id="nameMode"
style="width:100%;font-size:16px">

<option value="blank">
Leave blank
</option>

<option value="input">
Enter names
</option>

</select>


<br><br>


<div id="nameInputBox" style="display:none">

Enter one assignment per line:

<textarea id="namesInput"
style="width:100%;height:120px"></textarea>

</div>


<br>


<label>
Classes to print:
</label>


<div id="classPicker"
style="
border:1px solid #999;
padding:5px;
max-height:200px;
overflow:auto;
">


${classes.map((c,i)=>`

<div class="classToggle selected"
data-index="${i}"
style="
padding:6px;
margin:2px;
cursor:pointer;
background:#e8ffe8;
border:1px solid #aaa;
">

P${c.Periods.trim()} - ${c.Description}

</div>

`).join("")}


</div>


<br>


<button id="makeSheets">
Create Sheets
</button>


<button id="overrideNames">
Override Names
</button>


<button id="cancelSheets">
Cancel
</button>


</div>

`;


document.body.appendChild(overlay);



/* ---------------- VARIABLES ---------------- */


const nameOverrides={};


const selectedClasses=new Set(
    classes.map((_,i)=>i)
);



/* ---------------- EVENTS ---------------- */


document.getElementById("nameMode").onchange=function(){

document.getElementById("nameInputBox").style.display =
this.value==="input"
?"block"
:"none";

};



document.getElementById("cancelSheets").onclick=()=>{

overlay.remove();

};



document.querySelectorAll(".classToggle").forEach(el=>{

el.onclick=function(){

const index=Number(this.dataset.index);


if(selectedClasses.has(index)){

selectedClasses.delete(index);

this.style.background="#eee";

}
else{

selectedClasses.add(index);

this.style.background="#e8ffe8";

}


};

});



/* ---------------- LOAD ROSTERS FUNCTION ---------------- */


async function loadRosters(){

let allClasses=[];


for(const c of classes){

try{

const html=await $.get(c.Url);


const start=
html.indexOf(
"SunGard.Tac.ClassRoster.Init"
);


const end=
html.indexOf(");",start);



let text=
html.substring(start,end+2)
.replace(
/^SunGard\.Tac\.ClassRoster\.Init\(/,
""
)
.replace(/\);$/,"");



let args=[];

eval("args=["+text+"]");



allClasses.push({

index:classes.indexOf(c),

name:c.Description,

period:c.Periods.trim(),

students:args[3]

});


}
catch(e){

console.log(
"Failed:",
c.Description,
e
);

}


}


return allClasses;

}



/* ---------------- OVERRIDE BUTTON ---------------- */


document.getElementById("overrideNames").onclick=async()=>{


const allClasses=await loadRosters();


const students=[

...new Map(

allClasses
.filter(c=>selectedClasses.has(c.index))
.flatMap(c=>c.students)
.map(s=>[
s.StudentId,
s
])

).values()

];



const box=document.createElement("div");


box.style.cssText=`

position:fixed;
inset:0;
background:rgba(0,0,0,.4);
z-index:1000000;
display:flex;
align-items:center;
justify-content:center;
font-family:Arial;

`;



box.innerHTML=`

<div style="
background:white;
padding:20px;
width:500px;
border-radius:10px;
">


<h2>
Override Names
</h2>


<input id="overrideSearch"
placeholder="Search student..."
style="
width:100%;
font-size:16px;
padding:6px;
">


<div id="overrideResults"
style="
max-height:300px;
overflow:auto;
margin-top:10px;
border:1px solid #ccc;
">
</div>


<button id="closeOverride">
Close
</button>


</div>

`;


document.body.appendChild(box);



const searchBox =
document.getElementById("overrideSearch");


const results =
document.getElementById("overrideResults");



function showResults(){


const search =
searchBox.value
.toLowerCase()
.trim();



const matches =
students
.filter(s=>

s.StudentNameLastFirst
.toLowerCase()
.includes(search)

)
.slice(0,50);



results.innerHTML="";



matches.forEach(s=>{


const item=document.createElement("div");


item.style.cssText=`

padding:8px;
border-bottom:1px solid #ccc;
cursor:pointer;

`;



item.textContent=s.StudentNameLastFirst;



item.onclick=()=>{


const newName=prompt(

"Change name to:",

nameOverrides[s.StudentId] ||
s.StudentNameLastFirst

);



if(newName){

nameOverrides[s.StudentId]=newName.trim();

item.textContent =
newName.trim();

}


};



results.appendChild(item);


});


}



searchBox.oninput=showResults;


showResults();



document.getElementById("closeOverride")
.onclick=()=>box.remove();


};



/* ---------------- CREATE ---------------- */


document.getElementById("makeSheets").onclick=async()=>{


if(selectedClasses.size===0){

alert("Select at least one class.");

return;

}


let columns=
Number(
document.getElementById("colCount").value
);



let assignmentNames=[];


if(
document.getElementById("nameMode").value==="input"
){

assignmentNames=
(document.getElementById("namesInput").value||"")
.split(/\r?\n/)
.map(x=>x.trim())
.filter(Boolean);

}



while(assignmentNames.length<columns){

assignmentNames.push("");

}


assignmentNames=
assignmentNames.slice(0,columns);



overlay.remove();



let allClasses=await loadRosters();



allClasses=
allClasses.filter(c=>
selectedClasses.has(c.index)
);

/* ---------------- PRINT ----------------*/


const win=window.open("");


win.document.write(`

<html>

<head>

<title>Grading Sheets</title>


<style>


@page{

size:letter portrait;

margin:.3in;

}


body{

font-family:Arial;

}


.page{

page-break-after:always;

}


h2{

font-size:16px;

margin:0 0 6px;

}



.assignmentGrid{

display:grid;

grid-template-columns:repeat(3,1fr);

gap:4px;

margin-bottom:4px;

}



.assignment{

height:16px;

font-size:12px;

border:1px solid black;

padding:2px;

overflow:hidden;

white-space:nowrap;

}



table{

border-collapse:collapse;

width:100%;

table-layout:fixed;

}



th,td{

border:1px solid black;

font-size:12px;

padding:2px;

text-align:center;

}



th{

background:#ddd;

}



.studentRow:nth-child(even){

background:#f2f2f2;

}



.name{

width:140px;

text-align:left;

white-space:nowrap;

overflow:hidden;

text-overflow:ellipsis;

}



.id{

width:45px;

}



.grade{

width:35px;

}



.score{

height:22px;

}



</style>


</head>


<body>


${
allClasses.map(cls=>`

<div class="page">


<h2>

${cls.name} - Period ${cls.period}

(${cls.students.length} students)

</h2>



<div class="assignmentGrid">

${
assignmentNames.map((n,i)=>`

<div class="assignment">

Assignment ${i+1}${n ? ": " + n : ""}

</div>

`).join("")
}

</div>



<table>


<tr>

<th class="name">
Student
</th>


<th class="id">
ID
</th>


<th class="grade">
Grade
</th>


${
Array.from(
{length:columns},
(_,i)=>`<th>${i+1}</th>`
).join("")
}


</tr>



${

cls.students

.sort((a,b)=>

a.StudentNameLastFirst.localeCompare(
b.StudentNameLastFirst
)

)

.map(s=>`

<tr class="studentRow">


<td class="name">

${nameOverrides[s.StudentId] || s.StudentNameLastFirst}

</td>



<td>

${s.StudentId}

</td>



<td>

${s.Grade}

</td>



${
Array.from(
{length:columns},
()=>`

<td class="score">

&nbsp;

</td>

`
).join("")
}



</tr>


`).join("")

}


</table>


</div>


`).join("")

}


</body>

</html>

`);



win.document.close();



setTimeout(()=>{

win.focus();

win.print();

},1000);



};


})();
