import { validationResult } from 'express-validator';

export const runValidations = async (req, validations) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return null;

    return errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
    }));
};