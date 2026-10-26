import React from "react";
import cordycepsUrl from "./assets/cordyceps.svg";
const paths = {
 Scan:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M9 9h6v6H9Z',
 Pencil:'M16 3l5 5 M4 15L16 3a3.5 3.5 0 0 1 5 5L9 20l-6 1Z M4 15l5 5',
 Sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
 Moon:'M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z',
 Plus:'M12 5v14 M5 12h14', Upload:'M12 16V3 M7 8l5-5 5 5 M4 16v5h16v-5', Download:'M12 3v13 M7 11l5 5 5-5 M4 16v5h16v-5', Search:'M21 21l-5-5 M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15', X:'M6 6l12 12 M18 6L6 18',Trash2:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',ZoomIn:'M21 21l-5-5 M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M7 10.5h7 M10.5 7v7', ZoomOut:'M21 21l-5-5 M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M7 10.5h7',Maximize:'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5',Leaf:'M20 3C7 1 1 10 6 16s17 1 14-13Z M4 21L16 9',Users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-3.8',Heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',ChevronRight:'M9 5l7 7-7 7',Undo2:'M3 10h11a6 6 0 0 1 0 12 M3 10l6-6 M3 10l6 6',Link:'M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2',Check:'M4 12l5 5L20 6',Move:'M12 3v18 M3 12h18 M8 7l4-4 4 4 M8 17l4 4 4-4 M7 8l-4 4 4 4 M17 8l4 4-4 4',PanelRightClose:'M14 3v18 M4 3h16v18H4Z M7 9l3 3-3 3'
};
function Icon({name,size=24,...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]}/></svg>;}
export const Cordyceps=({size=24,...props})=><img src={cordycepsUrl} width={size} height={size} alt="" aria-hidden="true" {...props}/>;
export const Plus=p=><Icon name="Plus" {...p}/>;
export const Upload=p=><Icon name="Upload" {...p}/>;
export const Download=p=><Icon name="Download" {...p}/>;
export const Search=p=><Icon name="Search" {...p}/>;
export const X=p=><Icon name="X" {...p}/>;
export const Trash2=p=><Icon name="Trash2" {...p}/>;
export const ZoomIn=p=><Icon name="ZoomIn" {...p}/>;
export const ZoomOut=p=><Icon name="ZoomOut" {...p}/>;
export const Maximize=p=><Icon name="Maximize" {...p}/>;
export const Leaf=p=><Icon name="Leaf" {...p}/>;
export const Users=p=><Icon name="Users" {...p}/>;
export const Heart=p=><Icon name="Heart" {...p}/>;
export const ChevronRight=p=><Icon name="ChevronRight" {...p}/>;
export const Undo2=p=><Icon name="Undo2" {...p}/>;
export const Link=p=><Icon name="Link" {...p}/>;
export const Check=p=><Icon name="Check" {...p}/>;
export const Move=p=><Icon name="Move" {...p}/>;
export const PanelRightClose=p=><Icon name="PanelRightClose" {...p}/>;

export const Sun=p=><Icon name="Sun" {...p}/>;
export const Moon=p=><Icon name="Moon" {...p}/>;

export const Pencil=p=><Icon name="Pencil" {...p}/>;

export const Scan=p=><Icon name="Scan" {...p}/>;
