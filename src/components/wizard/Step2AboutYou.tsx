import React, { useState } from 'react'
import { useWizard } from '../../contexts/WizardContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

const genderOptions = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'other', label: 'Other' }
]

const styleOptions = [
  'Casual', 'Elegant', 'Edgy', 'Bohemian', 'Minimalist', 
  'Classic', 'Trendy', 'Sophisticated', 'Sporty', 'Vintage'
]

const colorOptions = [
  'Black', 'White', 'Navy', 'Gray', 'Beige', 'Brown',
  'Red', 'Pink', 'Purple', 'Blue', 'Green', 'Yellow',
  'Orange', 'Gold', 'Silver', 'Cream', 'Burgundy', 'Teal'
]

// Article types from actual CSV data, grouped by category
const articleTypeOptions = {
  'Topwear': ['Tshirts', 'Shirts', 'Kurtas', 'Tops', 'Sweatshirts', 'Jackets', 'Sweaters', 'Kurtis', 'Tunics'],
  'Bottomwear': ['Jeans', 'Shorts', 'Track Pants', 'Trousers', 'Skirts', 'Capris', 'Leggings', 'Patiala'],
  'Footwear': ['Casual Shoes', 'Sports Shoes', 'Heels', 'Flip Flops', 'Sandals', 'Formal Shoes', 'Flats'],
  'Dresses & Sets': ['Dresses', 'Sarees', 'Kurta Sets'],
  'Loungewear': ['Nightdress', 'Night suits', 'Lounge Pants', 'Lounge Shorts', 'Bath Robe'],
  'Accessories': ['Dupatta', 'Ties', 'Waistcoat']
}

export const Step2AboutYou: React.FC = () => {
  const { formData, updateFormData, nextStep, prevStep } = useWizard()
  const [gender, setGender] = useState(formData.gender)
  const [selectedArticleTypes, setSelectedArticleTypes] = useState<string[]>(formData.preferredArticleTypes || [])
  const [selectedStyles, setSelectedStyles] = useState<string[]>(formData.preferredStyles)
  const [selectedColors, setSelectedColors] = useState<string[]>(formData.preferredColors)
  const [customStyle, setCustomStyle] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const toggleArticleType = (articleType: string) => {
    setSelectedArticleTypes(prev => 
      prev.includes(articleType) 
        ? prev.filter(t => t !== articleType)
        : [...prev, articleType]
    )
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    )
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const addCustomStyle = () => {
    if (customStyle.trim() && !selectedStyles.includes(customStyle.trim())) {
      setSelectedStyles(prev => [...prev, customStyle.trim()])
      setCustomStyle('')
    }
  }

  const addCustomColor = () => {
    if (customColor.trim() && !selectedColors.includes(customColor.trim())) {
      setSelectedColors(prev => [...prev, customColor.trim()])
      setCustomColor('')
    }
  }

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!gender) {
      newErrors.gender = 'Please select your gender'
    }
    if (selectedArticleTypes.length === 0) {
      newErrors.articleTypes = 'Please select at least one item type you\'re looking for'
    }
    if (selectedStyles.length === 0) {
      newErrors.styles = 'Please select at least one style preference'
    }
    if (selectedColors.length === 0) {
      newErrors.colors = 'Please select at least one color preference'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validateForm()) {
      updateFormData({ 
        gender, 
        preferredArticleTypes: selectedArticleTypes,
        preferredStyles: selectedStyles,
        preferredColors: selectedColors
      })
      nextStep()
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-8 animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-gray-900 mb-4">
          Tell me a bit about you.
        </h1>
      </div>

      <div className="space-y-6">
        <Select
          label="Gender"
          options={genderOptions}
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          error={errors.gender}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            What items are you looking for? (select all that apply)
          </label>
          
          {Object.entries(articleTypeOptions).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {items.map((articleType) => (
                  <button
                    key={articleType}
                    onClick={() => toggleArticleType(articleType)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 text-left ${
                      selectedArticleTypes.includes(articleType)
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {articleType}
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          {errors.articleTypes && (
            <p className="mt-1 text-sm text-red-600">{errors.articleTypes}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preferred Styles (select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {styleOptions.map((style) => (
              <button
                key={style}
                onClick={() => toggleStyle(style)}
                className={`px-4 py-2 rounded-lg text-sm transition-all duration-200 ${
                  selectedStyles.includes(style)
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
          
          {/* Custom style input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add your own style..."
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomStyle()}
              className="flex-1"
            />
            <Button
              onClick={addCustomStyle}
              variant="secondary"
              disabled={!customStyle.trim()}
            >
              Add
            </Button>
          </div>
          
          {/* Display selected custom styles */}
          {selectedStyles.filter(style => !styleOptions.includes(style)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStyles.filter(style => !styleOptions.includes(style)).map((style) => (
                <span
                  key={style}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-900 text-white"
                >
                  {style}
                  <button
                    onClick={() => toggleStyle(style)}
                    className="ml-2 text-gray-300 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {errors.styles && (
            <p className="mt-1 text-sm text-red-600">{errors.styles}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Preferred Colors (select all that apply)
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => toggleColor(color)}
                className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center ${
                  selectedColors.includes(color)
                    ? 'bg-gray-900 text-white ring-2 ring-gray-900 ring-offset-2'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div 
                  className={`w-3 h-3 rounded-full mr-2 border border-gray-300`}
                  style={{ 
                    backgroundColor: color.toLowerCase() === 'white' ? '#ffffff' : 
                                   color.toLowerCase() === 'black' ? '#000000' :
                                   color.toLowerCase() === 'navy' ? '#1e3a8a' :
                                   color.toLowerCase() === 'gray' ? '#6b7280' :
                                   color.toLowerCase() === 'beige' ? '#f5f5dc' :
                                   color.toLowerCase() === 'brown' ? '#8b4513' :
                                   color.toLowerCase() === 'burgundy' ? '#800020' :
                                   color.toLowerCase() === 'teal' ? '#008080' :
                                   color.toLowerCase() === 'cream' ? '#fffdd0' :
                                   color.toLowerCase() === 'gold' ? '#ffd700' :
                                   color.toLowerCase() === 'silver' ? '#c0c0c0' :
                                   color.toLowerCase()
                  }}
                />
                {color}
              </button>
            ))}
          </div>
          
          {/* Custom color input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add your own color..."
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomColor()}
              className="flex-1"
            />
            <Button
              onClick={addCustomColor}
              variant="secondary"
              disabled={!customColor.trim()}
            >
              Add
            </Button>
          </div>
          
          {/* Display selected custom colors */}
          {selectedColors.filter(color => !colorOptions.includes(color)).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedColors.filter(color => !colorOptions.includes(color)).map((color) => (
                <span
                  key={color}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-900 text-white"
                >
                  {color}
                  <button
                    onClick={() => toggleColor(color)}
                    className="ml-2 text-gray-300 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {errors.colors && (
            <p className="mt-1 text-sm text-red-600">{errors.colors}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={prevStep}
            variant="secondary"
            className="flex-1"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}