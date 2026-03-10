const Category = require('../models/Category');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const { tree } = req.query;

    if (tree === 'true') {
      // Get hierarchical categories
      const categories = await Category.find({ parent: null, isActive: true })
        .populate({
          path: 'subcategories',
          match: { isActive: true },
          populate: {
            path: 'subcategories',
            match: { isActive: true }
          }
        })
        .sort({ order: 1, name: 1 });

      return res.status(200).json({
        success: true,
        data: categories
      });
    }

    const { page = 1, limit = 20, parent } = req.query;

    const query = { isActive: true };
    if (parent === 'null' || parent === '') {
      query.parent = null;
    } else if (parent) {
      query.parent = parent;
    }

    const categories = await Category.find(query)
      .populate('parent', 'name')
      .sort({ order: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name slug')
      .populate({
        path: 'subcategories',
        match: { isActive: true }
      });

    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, image, parent, order } = req.body;

    // Set level based on parent
    let level = 0;
    if (parent) {
      const parentCategory = await Category.findById(parent);
      if (parentCategory) {
        level = parentCategory.level + 1;
      }
    }

    if (level > 2) {
      return next(new ErrorResponse('Maximum category depth is 3 levels', 400));
    }

    const category = await Category.create({
      name,
      description,
      image,
      parent,
      level,
      order
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description, image, parent, order, isActive } = req.body;

    let category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    // Update level if parent changed
    if (parent && parent !== category.parent.toString()) {
      const parentCategory = await Category.findById(parent);
      if (parentCategory && parentCategory.level >= 2) {
        return next(new ErrorResponse('Maximum category depth is 3 levels', 400));
      }
      category.level = parentCategory ? parentCategory.level + 1 : 0;
    }

    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.image = image !== undefined ? image : category.image;
    category.parent = parent !== undefined ? parent : category.parent;
    category.order = order !== undefined ? order : category.order;
    category.isActive = isActive !== undefined ? isActive : category.isActive;

    await category.save();

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ErrorResponse('Category not found', 404));
    }

    // Check if category has children
    const children = await Category.countDocuments({ parent: req.params.id });
    if (children > 0) {
      return next(new ErrorResponse('Cannot delete category with subcategories', 400));
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
