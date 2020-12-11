import "./plan-summary-tab.scss"

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Card } from "azure-devops-ui/Card";
import {
        ColumnMore,
        ITableColumn,
        SimpleTableCell,
        Table,
        TwoLineTableCell,
        ColumnSorting,
        SortOrder,
        sortItems,
} from "azure-devops-ui/Table";
import { Status, Statuses, StatusSize } from "azure-devops-ui/Status";
import { Observer  } from "azure-devops-ui/Observer";
import * as SDK from "azure-devops-extension-sdk";
import * as API from "azure-devops-extension-api";
import {TaskAgentRestClient} from "azure-devops-extension-api/TaskAgent";
import {BuildRestClient, IBuildPageDataService , BuildServiceIds} from "azure-devops-extension-api/Build";
import {CoreRestClient} from "azure-devops-extension-api/Core";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";



import { CommonServiceIds, getClient, IProjectInfo, IProjectPageService } from "azure-devops-extension-api";

import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";


import {
    default as AnsiUp
} from 'ansi_up';


import {
    fixedColumns,
    tableItems,
} from "./table-data"

import { examplePlan1 } from "./tfplan"
import { RestClientBase } from "azure-devops-extension-api/Common/RestClientBase";
import { ObservableValue, ObservableObject  } from "azure-devops-ui/Core/Observable";

class TerraformPlanDisplay extends React.Component {
    //private planContent = new ObservableValue<JSX.Element>(<Spinner label="OLOLO" size={SpinnerSize.large}/>)
    private planContent = new ObservableValue<string>("test")
    private planCo = new ObservableObject<JSX.Element>()
    private planC = new ObservableValue({__html: "Not ready yet."})

    constructor(props: {} | Readonly<{}>){
        super(props)
        this.planCo.add("content", <Spinner key="ololo-spinner" label="OLOLO" size={SpinnerSize.large}/>)
    }

    public componentDidMount() {
        SDK.init();
        
        this.renderPlainPlan();
    }

    public render(): JSX.Element {
        return (
            <div className="flex-grow">
                <Card className="flex-grow bolt-table-card"
                    titleProps={{ text: "Terraform plan summary" }}
                    contentProps={{ contentPadding: false }}>

                    <Table
                        ariaLabel="Basic Table"
                        columns={fixedColumns}
                        itemProvider={tableItems}
                        role="table"
                        className="tf-plan-summary"
                        containerClassName="h-scroll-auto"
                    />
                </Card>
                
                <Card className="flex-grow"
                    titleProps={{ text: "Terraform plan output" }}>
                    <div className="flex-grow flex-column">
                        <Observer dangerouslySetInnerHTML={this.planC}>
                            <div/>
                        </Observer>
                    </div>
                </Card>
            </div>
        );
    }

    private async renderPlainPlan(): Promise<void> {
        /*
        const projectService = SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService)
            .then((res) => {
                console.log("Got projectService")
                return res
            })
            .catch((err) => {
                console.log("Failed to get projectService")
            })
        */
    
        const projectService =  await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const buildService = await SDK.getService<IBuildPageDataService>(BuildServiceIds.BuildPageDataService);
        const p = await projectService.getProject();
        const b = await buildService.getBuildPageData(); //requires await to work eventhough does not return Promise
        
        console.log("Username: "+ SDK.getUser().name)
        console.log("Username: "+ SDK.getUser().id)
        console.log("The token: " + await SDK.getAccessToken())
        if (p) {
            console.log("got project " + p.id + " " + p.name)
            this.planC.value = {__html: p.name}
        } else {
            console.log("no project?")
            return
        }
        if (b && b.build) {           
            console.log("got some build " + b.build?.id.toString())    
        } else {
            console.log("no build?")
            return
        }

        const buildClient = getClient(BuildRestClient)
        const build = await buildClient.getBuild(p.name, b.build.id)
        if (!build) {
            console.log("cannot get build")
            return
        }
        const timeline = await buildClient.getBuildTimeline(p.name, build.id)
        if (!timeline) {
            console.log("No timeline")
            return
        }

        for (let i of timeline.records) {
            console.log(i.name + ": task-" +i.task+" type-" +i.type+" id " + i.id + " att:" +i.attempt + "ididi: " + i.identifier)
            
        }
        
               
        const attach = await buildClient.getAttachment(p.id, build.id, "6c731c3c-3c68-459a-a5c9-bde6e6595b5b", "be7c4c18-daf2-5379-a4ad-97bf6adfd74a", "textplan", "tfplan.txt")
        const td = new TextDecoder()
        console.log(td.decode(attach))
        const ansi_up = new AnsiUp();
        const plan = "<pre>" + ansi_up.ansi_to_html(td.decode(attach)) + "</pre>"
        this.planC.value = {__html: plan}


        /*
        let project: IProjectInfo

        Promise.all([
           
           
        ]).then((res) => {
            console.log("Got all services")
            return res
            
        }).catch((err) => {
            console.log("Could not build services " + err)
        })
        console.log("timeout in")
        setTimeout(() => {
            
            this.planContent.value = "something else"
            this.planCo.add("content", <h1>whee</h1>)
            this.planC.value = {__html: "whoop whoop"}
            console.log("look ma, no hands!")
        }, 3000);     
        console.log("timeout out")
        */

        /*
        .then((res) => { 
            const p = projectService.getProject()
            if (p) {
                return p
            } else {
                return new Promise<string>((resolve, reject) => { reject("Looks like this is not running as part of the devops.") })
            }
            project = res })
        .catch()
    /*
        const projectService =  await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const project =  await projectService.getProject()
        if (! project) {
            return <span> cant get project </span>
        }
        
        const buildService = await SDK.getService<IBuildPageDataService>(BuildServiceIds.BuildPageDataService);
        const build = buildService.getBuildPageData();
        //const t = buildService.get
        if (!build?.build) {
            return "cant get build"
        }
        //const buildClient = getClient(BuildRestClient)
        //buildClient.getAttachment(project.id!, build.build.id, "timelineid", "recordid", "textplan", "tfplan.txt")
        
        //const o: API.IVssRestClientOptions = {}
        //const t: API.RestClientFactory<TaskAgentRestClient> = 
        */
    }

}

function renderPlan() : JSX.Element {

    const ansi_up = new AnsiUp();

    var res = [];
    var lines = examplePlan1.split('\n');
    var plan = ansi_up.ansi_to_html(examplePlan1)
    /*
    for(var i = 0;i < lines.length;i++){
        var line = ansi_up.ansi_to_html(lines[i])
        const thing = (
            <span dangerouslySetInnerHTML={{__html: line}}></span>
            )
        res.push(thing)
    }
    */
   return (<pre dangerouslySetInnerHTML={{__html: plan}}/>)
    //return (<pre className="flex-grow flex-column"> {res} </pre>)
    //return <code> {examplePlan1} </code>
    // return (<span className="flex-row"> testotest </span>)
    //return ansi_up.ansi_to_html(examplePlan1)
    // dangerouslySetInnerHTML={{__html: line}}
}


ReactDOM.render(<TerraformPlanDisplay />, document.getElementById("root"));