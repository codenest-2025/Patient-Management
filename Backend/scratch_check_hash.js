const bcrypt = require('bcryptjs');

const checkHash = async () => {
    const hash = '$2b$10$zTb.imKDPcicJigviV8AEOC99CJLT6gNO8ty.Idg1trsRoi3AwUC2';
    
    const is123456 = await bcrypt.compare('123456', hash);
    const isAdmin123 = await bcrypt.compare('admin123', hash);
    const isAdmin = await bcrypt.compare('admin', hash);
    
    console.log('Is 123456:', is123456);
    console.log('Is admin123:', isAdmin123);
    console.log('Is admin:', isAdmin);
}

checkHash();
