// Main photograph rectangles measured from the original 2025 portfolio PDF.
// Coordinates use the PDF's top-left origin. Protect these areas so white sky,
// facade panels and pale rendering details remain opaque; only the surrounding
// paper is removed in the tree preview. The hidden right information columns
// deliberately have no protected area.
const PAGE_WIDTH=1190.550048828125,PAGE_HEIGHT=668.9760131835938;
const photographs={
 '01-oct-kunming':[218.740112,87.785126,876.614075,581.190613],
 '02-huawai-school':[218.740112,122.686615,971.810974,546.289001],
 '03-greater-bay':[262.086578,105.389801,928.464478,581.850037],
 '05-hk-museums':[218.739990,106.830170,971.810852,521.190674],
 '04-essence':[313.937012,45.226196,781.417358,581.850037],
 '06-shanghai-ai':[265.713348,114.230896,929.090332,583.648682],
 '07-oct-performance':[262.086609,137.612823,971.810913,581.190552],
 '08-xili':[218.740234,116.335419,971.811096,540.190552],
 '09-sct':[409.133789,45.145996,782.453491,582.190918],
 '10-hengyu':[218.740112,79.558044,971.810974,581.190613],
 '11-pingan':[364.251984,45.177795,831.968506,581.190674],
 '12-urban-ambition':[363.657501,28.345398,832.562866,640.513184],
 '13-kwg':[447.263733,45.036560,743.287476,584.694580],
};

export function coverPhotoRectangle(projectId){
 const box=photographs[projectId];
 // New user-supplied images stay intact until their photograph extent is known.
 return box?[box[0]/PAGE_WIDTH,box[1]/PAGE_HEIGHT,box[2]/PAGE_WIDTH,box[3]/PAGE_HEIGHT]:[0,0,1,1];
}
