import { useEffect, useRef, useState } from "react";
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

import SelectedPhotosCtrl from "./selectedPhotoCtrl";
import { FilePhoto, FileUploadStatus } from "../../../datatypes";
import { log } from "../../../utils/log";

type UploadImageType = {
    maxSelect?: number, tag?: string,
    hasSecondAction?:boolean, panelPage?: string,
    fileUpload: React.RefObject<HTMLInputElement>,
    secondAction: (ids: string[], photoset: FilePhoto[]) => void,
    setPanelPage?: React.Dispatch<React.SetStateAction<string>>,
    uploading: boolean,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>
};

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export function UploadImageComponent({ maxSelect=0, tag, panelPage, fileUpload, hasSecondAction, secondAction, uploading, setUploading, setPanelPage }:UploadImageType){
    const [selected, setSelected] = useState<FilePhoto[]>([]);
    const [completed, setCompleted] = useState<FileUploadStatus[]>([]);

    const beginUploadFlag = useRef(0);

    /* Upload */
    const beginUpload = () => {
        try {
            if(selected?.length > 0 && !uploading && (panelPage === "" || panelPage === undefined)){
                setUploading(true); 
                if(setPanelPage) setPanelPage("step_1");
            }
        }
        catch(ex){
            log.error(`Beginning Upload: ${ex}`);
        }
    }

    const handleInputChange = (e:any) => {
        try {
            let files = e.target.files, selList = [],
                remaining = maxSelect ? maxSelect - selected.length : -1;

            // Begin Upload
            beginUploadFlag.current = files?.length ?? 0;

            // Add Upload Selected Files
            for(let i=0; i < files.length; i++){
                if(remaining >= 0 && selList.length >= remaining){
                    toast.warning(`You have reached the max file upload amount`, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: false,
                        draggable: true, progress: undefined, theme: "light" });
                    break;
                }

                if(files[i].size > MAX_UPLOAD_SIZE) {
                    toast.warning(`[${files[i].name}] is too large to upload`, { position: "top-right",
                        autoClose: 5000, hideProgressBar: false, closeOnClick: true, pauseOnHover: false,
                        draggable: true, progress: undefined, theme: "light" });
                }
                else {
                    selList.push(files[i].fileId);

                    let reader = new FileReader();
                    reader.onload = (e) => {
                        let tmpPhotoFile = {
                            url: e?.target?.result, type: 'file',
                            fileId: uuidv4(), file: files[i]
                        };

                        setSelected((d:any) => {
                            let tmp = [...d, tmpPhotoFile];
                            return tmp;
                        });
                    }
                    reader.readAsDataURL(files[i]);
                }
            }
        }
        catch(ex){
            log.error(`Uploading File: ${ex}`);
        }
    }

    useEffect(()=>{
        if(beginUploadFlag.current > 0 && beginUploadFlag.current === selected.length){
            beginUpload();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[selected]);
    
    useEffect(()=>{
        if(uploading && (selected?.length > 0 && selected?.length === completed?.length)){
            if(setPanelPage) setPanelPage((hasSecondAction ? "step_2" : "complete"));

            setTimeout(() => {
                if(hasSecondAction){
                    let idList = completed.filter((c)=> { return c.success === true && c.id != null }).map((c1) => { return c1.id ?? ""; });
                    secondAction(idList, selected);
                }

                // Reset Fields
                setUploading(false);
                setSelected([]);
                setCompleted([]);
            }, 1500);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[completed]);
    
    return(
        <>
            {/* Display Uploaded */}
            <SelectedPhotosCtrl hidden={true} maxSelect={maxSelect} selected={selected} uploadFlag={uploading} setCompleted={setCompleted} toggleImage={()=>{}} tag={tag} />
            
            {/* Upload Img */}
            <input type="file" className="img-input" hidden name="imgFile" accept="image/*" multiple onChange={handleInputChange} ref={fileUpload} />
        </>
    );
}