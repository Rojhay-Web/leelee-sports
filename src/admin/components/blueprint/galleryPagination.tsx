
function GalleryPagination({ page, hasPagesLeft, updatePage }: { page: number, hasPagesLeft: Boolean, updatePage: (dir:number) => void }){
    return(
        <div className="gallery-page-container">
            <span className={`pg-ctrl material-symbols-outlined ${page > 1 ? '':'disable'}`} onClick={()=> { updatePage(-1); }}>arrow_left</span>
            <div className="page-icon-container">
                {page > 1 ? <div className="pg-icon prev" /> : <></> }
                <div className="pg-icon current">{page}</div>
                {hasPagesLeft ? <div className="pg-icon next" /> : <></> }
            </div>
            <span className={`pg-ctrl material-symbols-outlined ${hasPagesLeft ? '':'disable'}`} onClick={()=> { updatePage(1); }}>arrow_right</span>
        </div>
    );
}

export default GalleryPagination;