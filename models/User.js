var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var db =require('../config/database');	

//  User model 
var User = db.define('users', {
    id: {
        type: Sequelize.INTEGER,
        unique: true,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
	username: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
}); 

User.beforeCreate((user, options) => {
	const salt = bcrypt.genSaltSync();
	user.password = bcrypt.hashSync(user.password, salt);
});
  
 
User.prototype.validPassword = function(password) {
        return bcrypt.compareSync(password, this.password);
      }; 

// create table
sequelize.sync()
    .then(() => console.log('User table created'))
    .catch(error => console.log('This error with sync', error));

module.exports = User;