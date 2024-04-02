const minimist = require("minimist");
let path=require('path');
let jsdom=require('jsdom');
let fs=require('fs');
let pdf=require('pdf-lib');
let xl=require('excel4node');
const axios = require("axios");
let args=minimist(process.argv);

dwndkaprmse=axios.get(args.url);
dwndkaprmse.then(function(res){
    let html= res.data;
    let dom=new jsdom.JSDOM(html);
    let document=dom.window.document;

    let matches=[];
    let matchscores=document.querySelectorAll('div.ds-p-4 > div.ds-flex');
     
     for(let i=0;i<matchscores.length;i++){
        let match={};
        let team=matchscores[i].querySelectorAll('p.ds-truncate');
        let res=matchscores[i].querySelector('p.ds-text-tight-s');
        match.t1=team[0].textContent;
        match.t2=team[1].textContent;
        let teamScr=matchscores[i].querySelectorAll('strong');
         
        if(teamScr.length==2){
            match.t1s=teamScr[0].textContent;
            match.t2s=teamScr[1].textContent;
        }else if(teamScr.length==1){
            match.t1s=teamScr[0].textContent;
            match.t2s=""
        }else{
            match.t1s=""
            match.t2s=""
        }
        match.res=res.textContent;
        matches.push(match);
     }
    let Json=JSON.stringify(matches); 
    fs.writeFileSync(args.matches,Json,"utf-8");
     let teams=[];
     for(let i=0;i<matches.length;i++){
         populateTeams(teams,matches[i]);
        }
     for(let i=0;i<matches.length;i++){
         SetMatchesAppropriately(teams,matches[i]);
        }
         let json=JSON.stringify(teams);
        fs.writeFileSync(args.dest,json,"utf-8");
        createExcelFile(teams);
        createFolders(teams);
})

function populateTeams(teams,match){

    
    let t1idx=teams.findIndex(function(team){
        if(team.name==match.t1){
            return true;
        }else{
            return false;
        }
    });
   
   
    if(t1idx==-1){
         team={
            name:match.t1,
            matches:[]
        };
        teams.push(team);
    }
    let t2idx=teams.findIndex(function(team){
        if(team.name==match.t2){
            return true;
        }else{
            return false;
        }
    });

    if(t2idx==-1){
        teams.push(team={
            name:match.t2,
            matches:[]
        });
    }
}

function SetMatchesAppropriately(teams,match){
    let t1idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t1){
            t1idx=i;
            break;
        }
    }

    let team1=teams[t1idx];
    team1.matches.push({
        vs:match.t2,
        selfScore:match.t1s,
        oppoScore:match.t2s,
        result:match.res
    });

    let t2idx=-1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.t2){
            t2idx=i;
            break;
        }
    }
    let team2=teams[t2idx];
    team2.matches.push({
        vs:match.t1,
        selfScore:match.t2s,
        oppoScore:match.t1s,
        result:match.res
    });

}

function createExcelFile(teams){

    let wb=new xl.Workbook();

    for(let i=0;i<teams.length;i++){
        let sheet= wb.addWorksheet(teams[i].name);
        sheet.cell(1,1).string("Opponent");
        sheet.cell(1,2).string("Self-Score");
        sheet.cell(1,3).string("Oppo Score");
        sheet.cell(1,4).string("Result");

        for(let j=0;j<teams[i].matches.length;j++){

          let opp=teams[i].matches[j].vs;  
          let ss=teams[i].matches[j].selfScore;  
          let os=teams[i].matches[j].oppoScore;
          let res=teams[i].matches[j].result;
           
          sheet.cell(2+j,1).string(opp);
          sheet.cell(2+j,2).string(ss);
          sheet.cell(2+j,3).string(os);
          sheet.cell(2+j,4).string(res);
        }
    }
    wb.write(args.excel);
}

function createFolders(teams){
    if(fs.existsSync(args.root)==false){
        fs.mkdirSync(args.root);
    }
    for(let i=0;i<teams.length;i++){
        let folder=path.join(args.root,teams[i].name)
        if(fs.existsSync(folder)==false){
            fs.mkdirSync(folder);
        }
        for(let j=0;j<teams[i].matches.length;j++){
            let teamsFolder=path.join(folder,teams[i].matches[j].vs+".pdf");
            if(fs.existsSync(teamsFolder)==false){
                createScoreCard(teams[i].name,teams[i].matches[j],teamsFolder);
            }
             
        }
    }
}

function createScoreCard(teamname,match,teamsFolder){
    let t1=teamname;
    let t2=match.vs;
    let t1s=match.selfScore;
    let t2s=match.oppoScore;
    let res=match.result;
    
    let templates=fs.readFileSync("WorldCup2019.pdf");
    let prmsetoload=pdf.PDFDocument.load(templates);
    prmsetoload.then(function(pdfdoc){
        let page=pdfdoc.getPage(0);
        page.drawText(t1,{
            x:320,
            y:670,
            size:16
        });
        page.drawText(t2,{
            x:320,
            y:650,
            size:16
        });
        page.drawText(t1s,{
            x:320,
            y:630,
            size:16
        })
        page.drawText(t2s,{
             x:320,
             y:605,
             size:16
        });
        page.drawText(res,{
             x:320,
             y:585,
             size:16
        });
        let pageSave=pdfdoc.save();
        pageSave.then(function(res){
             if(fs.existsSync(teamsFolder+".pdf")==true){
                fs.writeFileSync(teamsFolder+"1.pdf",res);
            }else{
                fs.writeFileSync(teamsFolder+".pdf",res);
            }
        })
    })
}
