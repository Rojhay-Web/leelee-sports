import { CSSProperties, Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from "react";
import { Column, ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useSearchParams } from "react-router-dom";
import Resizer from "react-image-file-resizer";
import { toast } from "react-toastify";

import { LeagueStoreAddon, LeagueStoreContextType, LeagueStoreItemType, LineItemDetailIndItemType, QuoteAddOnItemType, QuoteLineItemType } from "../../datatypes/customDT";
type StoreMenuItemType = {
    type: string;
    item?: LeagueStoreItemType;
    setSelStoreItem: Dispatch<SetStateAction<LeagueStoreItemType | undefined>>; 
}
type AddOnToolType = {
    defaultAddOns?: LeagueStoreAddon[];
    selectedAddOns?: QuoteAddOnItemType[];
    setLineItem: Dispatch<SetStateAction<QuoteLineItemType | undefined>>;
}

type CustomItemListToolType = {
    lineItem?: QuoteLineItemType;
    setLineItem: Dispatch<SetStateAction<QuoteLineItemType | undefined>>;
}

import leagueStoreContext from '../../context/leaguestore.context';

import { getPrice } from "../../utils/_customUtils";
import { API_URL, formatDate } from "../../utils";
import { log } from "../../utils/log";

const storeMenuPageDetails: {[key: string] : any } = {
    "leagues": { 
        backTitle: "Back To All Leagues",
        quantityTitle:"Player Participants",
        additionalPriceDetails: true,
        dateRange: true,
        groupCategory: true
    },
    "apparel": { 
        backTitle: "Back To All Apparel",
        quantityTitle:"Item Quantity",
        additionalPriceDetails: false,
        dateRange: false,
        groupCategory: false
    }
}

const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

// Images
import default_img from '../../assets/logo/leeleekiddz_league_store.png';

function AddOnTool({ defaultAddOns, selectedAddOns, setLineItem }:AddOnToolType){
    const [openToggle, setOpenToggle] = useState(false);

    const calcPrice = (min?:number, perPrice?:number) =>{
        let ret = '$$';
        try {
            if(min && perPrice){
                let defaultPrice = perPrice * min;
                ret = formatter.format(defaultPrice);
            }
        } catch(ex){
            log.error(`Getting Price: ${ex}`);
        }

        return ret;
    }

    const addonIsSelected = (title?:string) => {
        let ret = false;
        if(title) {
            ret = selectedAddOns?.find((ad) => ad.title === title) !== undefined;
        }

        return ret;
    }

    const toggleAddOn = (addOn: LeagueStoreAddon) =>{
        try {
            let isAdded = addonIsSelected(addOn?.title);

            setLineItem((p)=>{                
                let tmpSel = p?.add_on_list ?? [];

                let isLocalSel = tmpSel?.find((ad) => ad.title === addOn?.title) !== undefined;

                if(isAdded) {
                    tmpSel = tmpSel?.filter((ts) => ts?.title !== addOn?.title);
                } else if(!isLocalSel) {
                    tmpSel.push(new QuoteAddOnItemType(addOn.title, addOn.minimum));
                }

                return { ...p, "add_on_list": tmpSel };
            })
        } catch(ex){
            log.error(`Toggling Addon: ${ex}`);
        }
    }

    return(
        <div className="str-drill-down-container">
            {defaultAddOns && defaultAddOns?.length > 0 &&
                <>
                    <div className="header-container" onClick={()=> setOpenToggle(p => !p)}>
                        <div className="header-text">
                            <span>Addon(s)</span>
                            <span className="mini-title">{selectedAddOns?.length ?? 0} Selected</span>
                        </div>
                        <span className="icon material-symbols-outlined">{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                    </div>

                    {openToggle &&
                        <div className="drill-list-container">
                            {defaultAddOns?.map((addon, i) =>
                                <div className={`drill-list-item ${addonIsSelected(addon?.title) ? 'sel' : ''}`} key={i}>
                                    <div className="check-bx-label" onClick={()=> { toggleAddOn(addon); }}>
                                        <button className="check-bx"/>
                                        <span>Request {addon.minimum} {addon.title}{/*(addon?.minimum && addon?.minimum > 1) ?'s' :''*/}</span>
                                    </div>

                                    <span className="price">+ {calcPrice(addon.minimum, addon.price)}</span>
                                </div>
                            )}
                        </div>
                    }
                </>
            }
        </div>
    );
}

function CustomItemListTool({lineItem, setLineItem }:CustomItemListToolType){
    const [openToggle, setOpenToggle] = useState(false);
    const [displayList, setDisplayList] = useState<LineItemDetailIndItemType[]>([])
    const [columns] = useState<ColumnDef<LineItemDetailIndItemType>[]>([
        { 
            id:"item_number",
            header: '#', accessorKey: 'item_number', 
            size: 50,
            cell: ({ row }: { row: any }) => { 
                return <div className="dd_table_cell">
                    <input type="number" name="item_number" value={row.original.item_number} onChange={(e) => updateRowField(row.index, e)} />
                </div>
            }
        },
        { 
            id:"item_title",
            header: 'Name', accessorKey: 'item_title', 
            cell: ({ row }: { row: any }) => { 
                return <div className="dd_table_cell">
                    <input type="text" name="item_title" value={row.original.item_title} onChange={(e) => updateRowField(row.index, e)} />
                </div>
            }
        },
        { 
            id:"item_category_sel",
            header: `${lineItem?.store_item?.category ?? 'Size'}`, 
            accessorKey: 'item_category_sel', size: 100,
            cell: ({ row }: { row: any }) => { 
                return <div className="dd_table_cell">
                    <select name="item_category_sel" value={row.original.item_category_sel} onChange={(e) => updateRowField(row.index, e)}>
                        <option hidden>Select A {lineItem?.store_item?.category ?? 'Size'}</option>
                        {lineItem?.store_item?.categorySet?.map((cs, i) =>
                            <option value={cs} key={i}>{cs}</option>
                        )}
                    </select>
                </div>
            }
        },
    ]);

    const table = useReactTable({
        data: displayList,
        columns,
        initialState: {},
        state: {},
        getCoreRowModel: getCoreRowModel(),
        debugTable: false, debugHeaders: false, debugColumns: false,
        columnResizeMode: "onChange",
    });

    const getCommonPinningStyles = (column: Column<LineItemDetailIndItemType>): CSSProperties => {
        const isPinned = column.getIsPinned();
        const isLastPinned = isPinned === "left" && column.getIsLastColumn("left");
        const width = column.getSize();

        return {
            width: width <= 25 ? 'initial' : column.getSize(),
            position: isPinned ? "sticky" : "relative",
            left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
            zIndex: isPinned ? 1 : 0,
            boxShadow: isLastPinned ? "rgba(170, 170, 170, 0.3) 4px 0px 4px -2px" : undefined
        };
    }

    const updateRowField = (index: number, e: any) => {
        let name = e.target.name;
        setDisplayList((p) =>{
            let tmpList: any[] = [...p];
            if(index < tmpList?.length){
                tmpList[index][name] = e.target.value;
            }

            return tmpList;
        });
    }

    useEffect(()=> {
        if(lineItem?.item_count){
            setDisplayList((p) =>{
                let tmpList = [...p];
                if(lineItem?.item_count && lineItem.item_count != tmpList.length){
                    if(lineItem.item_count > tmpList.length){
                        // ADD Items
                        const diff = (lineItem.item_count - tmpList.length);

                        for(let i=0; i < diff; i++){
                            tmpList.push(new LineItemDetailIndItemType());
                        }
                    } else if(lineItem.item_count < tmpList.length){
                        // REMOVE Items
                        const diff =  tmpList.length - lineItem.item_count;

                        for(let i=0; i < diff; i++){
                            tmpList.pop();
                        }
                    }
                }

                return tmpList;
            });
        }
    },[lineItem?.item_count]);

    useEffect(()=>{
        if(displayList){
            setLineItem((p) =>{
                return { ...p, "custom_item_list": displayList };
            });
        }
    },[displayList]);

    useEffect(()=>{
        if(lineItem?.custom_item_list){
            setDisplayList(lineItem.custom_item_list);
        } 
    },[]);

    return(
        <div className="str-drill-down-container">
            {lineItem?.store_item?.details?.customDesign === true &&
                <>
                    <div className="header-container" onClick={()=> setOpenToggle(p => !p)}>
                        <div className="header-text">
                            <span>Individual Item Designs</span>
                        </div>
                        <span className="icon material-symbols-outlined">{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                    </div>

                    {openToggle &&
                        <div className="drill-list-container sm-padding">
                            <table className="drill-down-table" style={{ width: table.getTotalSize() }}>
                                <thead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                return(
                                                    <th key={header.id} colSpan={header.colSpan}
                                                        style={{ ...getCommonPinningStyles(header.column) }}
                                                    >
                                                        <div className={`dd-header-container ${header.column.getCanSort() ? 'sortable' : ''}`} onClick={header.column.getToggleSortingHandler()}>
                                                            {flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext(),
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map((row, idx) => {
                                        return (
                                            <tr key={row.id} style={{ zIndex: table.getRowModel().rows.length - idx }}>
                                                {row.getVisibleCells().map((cell) => {
                                                    return (
                                                        <td key={cell.id}
                                                            style={{ ...getCommonPinningStyles(cell.column) }}
                                                        >
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext(),
                                                            )}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    }
                </>
            }
        </div>
    )
}

function CustomDesignTool({lineItem, setLineItem }:CustomItemListToolType){
    const [openToggle, setOpenToggle] = useState(false);

    const photoRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: any) => {
        let name = e.target.name;

        setLineItem((p) =>{
            return { ...p, [name]: e.target.value };
        });
    }

    const clearImg = (e:any) => {
        handleChange({ target: { name: "design_img", value: null }});
        e.stopPropagation();
    }

    const setImageFile = (e:any) => {
        try {
            if (e.target.files[0]) {
                Resizer.imageFileResizer(e.target.files[0],
                    400, 400, "JPEG", 50, 0,
                    (uri) => { 
                        handleChange({ target: { name: e.target.name, value: uri }});
                        // Clear Target Value
                        e.target.value = null;
                    },
                    "base64", 200, 200
                );
            }
        } catch(ex){
            log.error(`Setting Image File: ${ex}`);
        }
    }

    const handleClick = () => {
        if(photoRef.current) {
            photoRef.current.click();
        }
    }

    return(
        <div className="str-drill-down-container">
            {lineItem?.store_item?.details?.customDesign === true &&
                <>
                    <div className="header-container" onClick={()=> setOpenToggle(p => !p)}>
                        <div className="header-text">
                            <span>Custom Design</span>
                        </div>
                        <span className="icon material-symbols-outlined">{openToggle ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                    </div>

                    {openToggle &&
                        <div className="drill-list-container row-view">
                            <div className="img-container">
                                <div className="item-img-container" onClick={handleClick}>
                                    <span className={`icon material-symbols-outlined ${lineItem?.design_img ? 'highlight' : ''}`}>add_a_photo</span>
                                    {lineItem?.design_img && 
                                        <>
                                            <div className="delete-img" onClick={clearImg}>
                                                <span className="material-symbols-outlined">delete_forever</span>
                                            </div>
                                            <img src={lineItem?.design_img} alt="Custom Design Image" />
                                        </>
                                    }
                                    <input className='hiddenInput' type="file" accept="image/*" name="design_img" ref={photoRef} onChange={setImageFile} />
                                </div>
                            </div>

                            <div className="content-container">
                                <div className="category-section">
                                    <div className="section-title">Team Name</div>

                                    <div className="input-container">
                                        <input type="text" name="design_name" value={lineItem?.design_name} onChange={handleChange}/>
                                    </div>
                                </div>

                                <div className="category-section">
                                    <div className="section-title">Design Notes</div>

                                    <div className="input-container">
                                        <textarea name="design_description" value={lineItem?.design_description} rows={2} onChange={handleChange}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                </>
            }
        </div>
    );
}

export default function StoreMenuItem({ type, item, setSelStoreItem }: StoreMenuItemType){
    const [searchParams] = useSearchParams();
    
    const [selPhotoIdx, setSelPhotoIdx] = useState(-1);
    const [selImg, setSelImg] = useState<string|undefined>(undefined);
    const [menuDetails, setMenuDetails] = useState(storeMenuPageDetails['leagues']);

    const [editLineItem, setEditLineItem] = useState<QuoteLineItemType|undefined>();
    const [errorList, setErrorList] = useState<string[]>([]);
    const [itemTotal, setItemTotal] = useState(0);

    const { calcLineItemSubTotal, addLineItem, getLineItem } = useContext(leagueStoreContext.LeagueStoreContext) as LeagueStoreContextType;
    
    const travesePhotoSet = (dir: number) => {
        if(dir < 0 && selPhotoIdx > 0){
            setSelPhotoIdx((p) => p -1);
        } else if(item?.photos && dir > 0 && (selPhotoIdx + 1) < item?.photos?.length){
            setSelPhotoIdx((p) => p + 1);
        }
    }

    const toggleCount = (increase: boolean) => {
        if(!increase && !((!editLineItem?.item_count || !item?.minimum) || (editLineItem?.item_count <= item?.minimum))){
            setEditLineItem((p) =>{
                let new_val = (p?.item_count ? (Number(p?.item_count) - 1) : 0);
                return { ...p, "item_count": new_val };
            });
        } else if(increase) {
            setEditLineItem((p) =>{
                let new_val = (p?.item_count ? (Number(p?.item_count) + 1) : 0);
                return { ...p, "item_count": new_val };
            });
        }
    }

    const handleChange = (e: any) => {
        let name = e.target.name;

        setEditLineItem((p) =>{
            return { ...p, [name]: e.target.value };
        });
    }

    const validateMenuItem = () => {
        let ret = true;
        try {
            let errorList: string[] = [];
            if(editLineItem?.store_item === undefined) {
                ret = false;
                // Add To Validation Error String
                errorList.push("Missing Store Item");
            } 

            if(!editLineItem?.item_count || !editLineItem?.store_item?.minimum || (editLineItem?.item_count < editLineItem.store_item.minimum)){
                ret = false;
                // Add To Validation Error String
                errorList.push("Minimum Item Count");
            }

            setErrorList(errorList);
        } catch(ex){
            log.error(`Validating StoreItem: ${ex}`);
        }

        return ret;
    }

    const upsertLineItem = () => {
        try {
            if(editLineItem && validateMenuItem()) {
                addLineItem(editLineItem);

                // Clear Selected Item
                setSelStoreItem(undefined);

                // Success Toast
                toast.success(`${(editLineItem?.quote_item_id) ? 'Updated' : 'Added'} Line Item`, { position: "top-left",
                    autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: true,
                    draggable: true, progress: undefined, theme: "light" });
            }
        } catch(ex){
            log.error(`Adding Line Item`);
        }
    }

    useEffect(()=>{
        if(item?.photos && selPhotoIdx >= 0 && selPhotoIdx < item?.photos.length){
            setSelImg(item?.photos[selPhotoIdx]?._id);
        } else {
            setSelImg(undefined);
        }
    },[selPhotoIdx]);

    useEffect(()=>{
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        if(item?.photos && item?.photos?.length > 0) {
            setSelPhotoIdx(0);
        }

        if(item){
            setEditLineItem(new QuoteLineItemType(item));
        }
    },[item]);

    useEffect(()=>{
        if(type in storeMenuPageDetails) {
            setMenuDetails(storeMenuPageDetails[type]);
        }
    },[type]);

    useEffect(()=> {
        if(validateMenuItem()){
            const li_totals = calcLineItemSubTotal(editLineItem);
            setItemTotal(li_totals.core_total + li_totals.addon_total);
        }
    },[editLineItem]);

    useEffect(()=>{
        const page_item = searchParams.get("item");
        if(page_item) {
            let line_item = getLineItem(type, page_item);

            setEditLineItem(line_item);
        }
    },[searchParams]);

    return (
        <div className="store-menu-item-container">
            <div className="back-button-container">
                <button className="back-button" onClick={()=> setSelStoreItem(undefined)}>
                    <span className="icon material-symbols-outlined">chevron_left</span>
                    <span className="back-title">
                        {(type in storeMenuPageDetails) ? storeMenuPageDetails[type].backTitle : "Back To All Store Items"}
                    </span>
                </button>
            </div>            

            <section className="details-component">
                <div className="selected-image-container">
                    {(selImg && selImg?.length > 0) ?
                        <img src={`${API_URL}/kaleidoscope/${selImg}`} /> :
                        <img src={default_img} className="default"/>                         
                    }
                </div>
                <div className="details-content">
                    <h1>{item?.title}</h1>

                    {/* Price Details */}
                    <div className="price-details-container">
                        <div className="price-row">
                            <div className="price">{getPrice(item?.price_per_item)}</div>
                            {menuDetails?.additionalPriceDetails === true &&
                                <div className="price-details">
                                    <span>/ per ({item?.minimum ?? "~"} kids) </span>
                                </div>
                            }
                        </div>

                        {menuDetails?.additionalPriceDetails === true &&
                            <div className="price-row">
                                <div className="price-details">
                                    <span>{getPrice(item?.additional_set_price)} / per after minimum</span>
                                </div>
                            </div>
                        }
                    </div>

                    {/* Dates */}
                    {menuDetails?.dateRange === true &&
                        <div className="detail-section">
                            <div className="section-title">League Dates</div>
                            <div className="date-row">
                                {item?.details?.start_dt &&
                                    <span>{formatDate(item?.details?.start_dt, 'MMM dd, yyyy')}</span>
                                }
                                {item?.details?.end_dt &&
                                    <>
                                        <span>-</span>
                                        <span>{formatDate(item?.details?.end_dt, 'MMM dd, yyyy')}</span>
                                    </>
                                }
                            </div>
                        </div>
                    }

                    <div className="detail-section">
                        <div className="section-title">Details</div>
                        <div className="section-text">{item?.description}</div>                            
                    </div>

                    {(item?.photos && item?.photos?.length > 1) &&
                        <div className="photoset-container">
                            <button className="page-ctrl" disabled={selPhotoIdx < 1} onClick={()=> travesePhotoSet(-1)}>
                                <span className="icon material-symbols-outlined">chevron_left</span>
                            </button>
                            
                            <div className="photoset-list-container">
                                {item?.photos?.map((photo, i) =>
                                    <button className={`set-list-photo ${i === selPhotoIdx ? 'sel' : ''}`} key={i} onClick={()=> setSelPhotoIdx(i) }>
                                        <img src={`${API_URL}/kaleidoscope/${photo._id}`} alt={`${photo?.title}`}/>
                                    </button>
                                )}
                            </div>
    
                            <button className="page-ctrl" disabled={(selPhotoIdx < 0 || selPhotoIdx >= (item?.photos?.length - 1))} onClick={()=> travesePhotoSet(1)}>
                                <span className="icon material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    }
                </div>
            </section>

            <section className="selection-component">
                {editLineItem && 
                    <div className="selection-fields">
                        {menuDetails?.groupCategory === true &&
                            <div className="category-section">
                                <div className="section-title">{item?.category}</div>

                                <div className="input-container">
                                    <select className="group-category-select" name="overall_category_sel" value={editLineItem?.overall_category_sel} 
                                        onChange={handleChange} disabled={!item?.categorySet || item?.categorySet?.length <= 1}>
                                        <option hidden>Please Select a {item?.category}</option>
                                        {item?.categorySet?.map((set, i) =>
                                            <option key={i} value={set}>{set}</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        }

                        {/* Custom Design Details */}
                        <CustomDesignTool lineItem={editLineItem} setLineItem={setEditLineItem}/>

                        <div className="quantity-count-container">
                            <div className="quantity-count">
                                <button disabled={(!editLineItem?.item_count || !item?.minimum) || (editLineItem?.item_count <= item?.minimum)} onClick={()=> toggleCount(false)}>
                                    <span className="material-symbols-outlined">remove</span>
                                </button>

                                <div className="input-container">
                                    <input type="number" name="item_count" min={item?.minimum ?? 0} step="1" value={editLineItem?.item_count} onChange={handleChange} autoComplete="off" />
                                </div>

                                <button onClick={()=> toggleCount(true)}>
                                    <span className="material-symbols-outlined">add</span>
                                </button>
                            </div>
                            <span className="title">{menuDetails?.quantityTitle ?? 'Quantity'}*</span>
                        </div>

                        {/* Custom Line Item List */}
                        <CustomItemListTool lineItem={editLineItem} setLineItem={setEditLineItem} />

                        {/* Additional Details */}
                        <div className="category-section">
                            <div className="section-title">Additional Details</div>

                            <div className="input-container">
                                <textarea name="item_additional_details" value={editLineItem?.item_additional_details} rows={2} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Add Ons */}
                        <AddOnTool defaultAddOns={item?.addons} selectedAddOns={editLineItem?.add_on_list} setLineItem={setEditLineItem} />
                    </div>
                }

                <div className="btn-container">
                    <button className="add-btn" disabled={errorList?.length > 0} onClick={upsertLineItem}>
                        <span className="title">{editLineItem?.quote_item_id ? 'Update Item':  'Add To Quote'}</span>

                        <span className="price">({getPrice(itemTotal)})</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
