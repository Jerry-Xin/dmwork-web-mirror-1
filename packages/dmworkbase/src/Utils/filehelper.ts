
import fileIcon from "./extends/file.png";
import wordIcon from "./extends/word.png";
import excelIcon from "./extends/excel.png";
import pptIcon from "./extends/ppt.png";
import pdfIcon from "./extends/pdf.png";
import zipIcon from "./extends/zip.png";
import rarIcon from "./extends/rar.png";

export enum FileType {
    Unkown, // 未知类型
    Word, // word类型
    Image,
    Excel,
    PPT,
    PDF,
    ZIP,
    RAR,
}

export default class FileHelper {


    static imgExt: Array<string> = new Array<string>(".png", ".jpg", ".jpeg", ".bmp", ".gif");//图片文件的后缀名
    static docExt: Array<string> = new Array<string>(".doc", ".docx");//word文件的后缀名
    static xlsExt: Array<string> = new Array<string>(".xls", ".xlsx");//excel文件的后缀名

    static getFileExt(fileName:string) {
        const i = fileName.lastIndexOf(".")
        if(i !==-1) {
            const ext = fileName.substring(i).toLowerCase();
            return ext
        }
        return ""
    }
    // 获取文件类型
    static getFileType(fileName: string) {
        const i = fileName.lastIndexOf(".")
        if (i !== -1) {
            const ext = fileName.substring(i).toLowerCase();
            if (this.contain(ext, this.imgExt)) {
                return FileType.Image;
            }
            if (this.contain(ext, this.docExt)) {
                return FileType.Word;
            }
            if (this.contain(ext, this.xlsExt)) {
                return FileType.Excel;
            }
            if (ext === '.ppt') {
                return FileType.PPT;
            }
            if (ext === '.pdf') {
                return FileType.PDF;
            }
            if (ext === '.zip') {
                return FileType.ZIP;
            }
            if (ext === '.rar') {
                return FileType.RAR;
            }
        }
    }
    static contain(obj: string, array: Array<string>) {
        for (let i = 0; i < array.length; i++) {
            if (array[i] === obj)
                return true;
        }
        return false;
    }
    // 获取文件icon信息
    static getFileIconInfo(fileName: string) {
        if (!fileName) {
            return null;
        }
        const fileType = this.getFileType(fileName);
        let icon = fileIcon;
        let fileBgColor = "rgb(255, 182, 24)";
        if (fileType === FileType.Word) {
            icon = wordIcon;
            fileBgColor = "rgb(73, 126, 247)";
        } else if (fileType === FileType.Excel) {
            icon = excelIcon;
            fileBgColor = "rgb(39, 204, 163)";
        } else if (fileType === FileType.PPT) {
            icon = pptIcon;
            fileBgColor = "rgb(255, 182, 24)";
        } else if (fileType === FileType.PDF) {
            icon = pdfIcon;
            fileBgColor = "rgb(255, 91, 16)";
        } else if (fileType === FileType.ZIP) {
            icon = zipIcon;
            fileBgColor = "rgb(234, 156, 112)";
        } else if (fileType === FileType.RAR) {
            icon = rarIcon;
            fileBgColor = "rgb(245, 180, 80)";
        }
        return { icon, color: fileBgColor };
    }
    // 格式化文件大小
    static getFileSizeFormat(size: number) {
        if (size < 1024) {
            return `${size} B`
        }
        if (size > 1024 && size < 1024 * 1024) {
            return `${(size / 1024).toFixed(2)} KB`
        }
        if (size > 1024 * 1024 && size < 1024 * 1024 * 1024) {
            return `${(size / 1024 / 1024).toFixed(2)} M`
        }
        return `${(size / (1024 * 1024 * 1024)).toFixed(2)}G`
    }

}
