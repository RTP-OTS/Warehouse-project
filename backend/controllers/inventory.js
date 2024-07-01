const pool = require("../config");

// GET all product
const getInventory = async (req, res) => {
  try {
    const result =
      pool.query(`SELECT i.inventory_id,p.product_id,p.product_name, i.quantity,i.create_at,i.last_update,i.status
            FROM inventory i
            JOIN products p ON i.product_id = p.product_id
            `);
    res.status(200).json((await result).rows);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST Withdraw product
const withdrawProduct = async (req, res) => {
  const { product_id, quantity } = req.body;
  try {
    // เริ่ม transaction
    await pool.query("BEGIN");

    // select ข้อมูล inventory จาก database
    const result = await pool.query(
      `SELECT quantity FROM inventory WHERE product_id =$1 AND status ='in'`,
      [product_id]
    );
    // ถ้าไม่มีสินค้านี้ใน datbase
    if (result.rows.length === 0) {
      throw new Error("Product not found");
    }

    const currentQuantity = result.rows[0].quantity;

    // ปริมาณที่จะลบไม่พอแล้ว จะต่ำกว่า 0 ไม่ได้
    if (currentQuantity < quantity) {
      throw new Error("Insufficient quantity");
    }
    // ตัวแปร ค่าใหม่ของ quantity โดย จำนวนปัจจุบัน - จำนวนที่ใส่
    const newQuantity = currentQuantity - quantity;

    // update ข้อมูล
    await pool.query(
      `UPDATE inventory SET quantity =$1, last_update = NOW(), status ='out' WHERE product_id =$2 AND status='in'`,
      [newQuantity, product_id]
    );

    await pool.query("COMMIT")
    res.status(200).json({success:true,message:"Product withdrawn successfully"})
  } catch (error) {
    await pool.query("ROLLBACK")
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getInventory,withdrawProduct };