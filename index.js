const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const port = 8000;

app.use(bodyParser.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'employeedb'
});

db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      return;
    }
    console.log('Connected to MySQL database');
  });


//API to get all employees details
app.get('/employees', (req, res) => {
    const query = `
      SELECT e.id AS employee_id, e.name AS employee_name, e.email AS employee_email, 
             c.phone AS contact_phone
      FROM employees AS e
      LEFT JOIN contact_details AS c ON e.id = c.employee_id;
    `;
  
    db.query(query, (err, rows, fields) => {
      if (!err) {
        const employees = {};
        rows.forEach((row) => {
          if (!employees[row.employee_id]) {
            employees[row.employee_id] = {
              id: row.employee_id,
              name: row.employee_name,
              email: row.employee_email,
              contactDetails: [],
            };
          }
          if (row.contact_phone) {
            employees[row.employee_id].contactDetails.push(row.contact_phone);
          }
        });
  
        const employeesArray = Object.values(employees);
  
        res.json(employeesArray);
      } else {
        console.error(err);
        res.status(500).json({ error: 'Error fetching employees' });
      }
    });
  });
  

//API to get a specific employee using employee id
app.get('/employees/:id', (req, res) => {
    const employeeId = req.params.id;
  
    const query = `
      SELECT e.id, e.name, e.email, cd.phone AS contact_phone
      FROM employees AS e
      LEFT JOIN contact_details AS cd ON e.id = cd.employee_id
      WHERE e.id = ?;
    `;
  
    db.query(query, [employeeId], (err, rows, fields) => {
      if (!err) {
        if (rows.length === 0) {
          res.status(404).json({ error: 'Employee not found' });
        } else {
          const employeeData = {
            id: rows[0].id,
            name: rows[0].name,
            email: rows[0].email,
            contactDetails: rows.map((row) => row.contact_phone).filter((phone) => phone !== null),
          };
  
          res.json(employeeData);
        }
      } else {
        console.error(err);
        res.status(500).json({ error: 'Error fetching employee details' });
      }
    });
  });
  

//API to delete a specific employee
app.delete('/employees/:id', (req, res) => {
    const employeeId = req.params.id;
 
    db.query('DELETE FROM contact_details WHERE employee_id = ?', [employeeId], (err, drows) => {
      if (!err) {
        db.query('DELETE FROM employees WHERE id = ?', [employeeId], (err, rows, fields) => {
          if (!err) {
            res.status(204).send("Employee Deleted successfully");
          } else {
            console.error(err);
            res.status(500).json({ error: 'Error deleting employee' });
          }
        });
      } else {
        console.error(err);
        res.status(500).json({ error: 'Error deleting contact details' });
      }
    });
  });
  
// API to update specific employee's details
app.put('/employees/:id', (req, res) => {
    const employeeId = req.params.id;
    const { name, email, contactDetails } = req.body;
  
    db.query('UPDATE employees SET name = ?, email = ? WHERE id = ?', [name, email, employeeId], (err, employeeUpdateResult) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: 'Error updating employee details' });
        return;
      }
  
      db.query('DELETE FROM contact_details WHERE employee_id = ?', [employeeId], (deleteErr) => {
        if (deleteErr) {
          console.error(deleteErr);
          res.status(500).json({ error: 'Error updating contact details' });
          return;
        }
  
        if (contactDetails && contactDetails.length > 0) {
          const contactValues = contactDetails.map((contact) => [employeeId, contact.phone]);
          db.query('INSERT INTO contact_details (employee_id, phone) VALUES ?', [contactValues], (insertErr) => {
            if (insertErr) {
              console.error(insertErr);
              res.status(500).json({ error: 'Error inserting contact details' });
              return;
            }
  
            res.status(200).json({ message: 'Employee details updated successfully' });
          });
        } else {
          res.status(200).json({ message: 'Employee details updated successfully' });
        }
      });
    });
  });
  


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
