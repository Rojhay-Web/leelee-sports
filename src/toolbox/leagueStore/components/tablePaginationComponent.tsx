import { Dispatch, SetStateAction, useEffect, useState } from "react";

type TablePaginationComponent = {
    loading: boolean,
    pageSize: number,
    page: number,
    totalItems: number,
    pagesLeft?: boolean,
    setPage: Dispatch<SetStateAction<number>>
}

export default function TablePaginationComponent({loading, totalItems, pageSize, pagesLeft, page, setPage}: TablePaginationComponent){
    const [maxPage, setMaxPage] = useState(page);
    const [pageDetails, setPageDetails] = useState({ start:0, end: 0 });

    const changePage = (dir: number) => {
        if(dir < 0 && page > 1){
            setPage((p) => p-1);
        } else if(dir > 0 && pagesLeft){
            setPage((p) => p+1);
        }
    }
    
    useEffect(()=>{ 
        const initItem = ((page - 1) * pageSize) + 1;
        let tailItem = initItem + pageSize - 1;
        tailItem = tailItem > totalItems ? totalItems : tailItem;
        
        setPageDetails({ start: initItem, end: tailItem });
    },[page, pageSize, totalItems]);

    return (
        <div className={`pagination-container ${loading ? 'loading' : ''}`}>
            <div className={`page-details`}>
                <span>{`${pageDetails.start}-${pageDetails.end} of ${totalItems}`}</span>
            </div>

            <div className="ctrl-container">
                <button className="page-ctrl" disabled={page === 1} onClick={()=> changePage(-1)}>
                    <span className="icon material-symbols-outlined">chevron_left</span>
                </button>

                {/* */}
                <div className={`page-list`}>
                    {page > 1 && <button className="page-btn" onClick={()=> setPage(page-1)}>{page - 1}</button>}
                    <div className="page-btn current">{page}</div>
                    {pagesLeft && <button className="page-btn" onClick={()=> setPage(page+1)}>{page + 1}</button> }
                </div>

                <button className="page-ctrl" disabled={!pagesLeft} onClick={()=> changePage(1)}>
                    <span className="icon material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>
    );
}
