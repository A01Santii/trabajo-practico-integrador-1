import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Article = sequelize.define(
    'Article',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: { len: [3, 200] },
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: { len: [50, 100000] },
        },
        excerpt: {
            type: DataTypes.STRING(500),
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('published', 'archived'),
            allowNull: false,
            defaultValue: 'published',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        tableName: 'articles',
    }
);