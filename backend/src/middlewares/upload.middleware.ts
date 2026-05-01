import multer from "multer";

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-"+file.originalname);
    }
});

//FILE FILTER
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    if(file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else{
        cb(new Error("Only image files are allowed"), false);
    }
}

export const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 10*1024*1024
    }
});