import * as React from "react";

import { ObservableValue } from "azure-devops-ui/Core/Observable";

import {
    ISimpleTableCell,
    renderSimpleCell,
    TableColumnLayout,
} from "azure-devops-ui/Table";
import { ISimpleListCell } from "azure-devops-ui/List";
import { css } from "azure-devops-ui/Util";
import { IStatusProps, Status, Statuses, StatusSize } from "azure-devops-ui/Status";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";


export interface ITableItem extends ISimpleTableCell {
    action: ISimpleListCell;
    amount: number;
}

export const fixedColumns = [
    {
        columnLayout: TableColumnLayout.singleLinePrefix,
        id: "action",
        name: "Resource Action",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-30),
    },
    {
        id: "amount",
        name: "",
        readonly: true,
        renderCell: renderSimpleCell,
        width: new ObservableValue(-30),
    },
];

interface IconSelector {
    statusProps: IStatusProps;
    label: string;
}


export const renderNoChange = (className?: string) => {
    return (
        <Status
            {...Statuses.Success}
            ariaLabel="no changes"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.s}
        />
    );
};

export const renderAdd = (className?: string) => {
    return (
        <Status
            {...Statuses.Information}
            ariaLabel="to add"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};

export const renderChange = (className?: string) => {
    return (
        <Status
            {...Statuses.Warning}
            ariaLabel="to change"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};

export const renderDestroy = (className?: string) => {
    return (
        <Status
            {...Statuses.Failed}
            ariaLabel="to destroy"
            className={css(className, "bolt-table-status-icon")}
            size={StatusSize.m}
        />
    );
};


export const rawTableItems: ITableItem[] = [
    {
        action: { iconProps: { render: renderAdd }, text: "To add" },
        amount: 40,      
    },
    {
        action: { iconProps: { render: renderChange }, text: "To change" },
        amount: 40,      
    },
    {
        action: { iconProps: { render: renderDestroy }, text: "To destroy" },
        amount: 40,      
    },
    {
        action: { iconProps: { render: renderNoChange }, text: "Unchanged" },
        amount: 40,      
    },
   
];

export const tableItems = new ArrayItemProvider<ITableItem>(rawTableItems);






















